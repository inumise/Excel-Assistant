from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter, column_index_from_string
import os
import uuid
import re
import tempfile
import shutil
import speech_recognition as sr
from pydub import AudioSegment
import io
import httpx
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app.ai_agent import ExcelAIAgent

app = FastAPI()

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# In-memory storage for spreadsheets
spreadsheets: Dict[str, Dict[str, Any]] = {}
TEMP_DIR = tempfile.mkdtemp()

class CommandRequest(BaseModel):
    spreadsheet_id: str
    command: str

class CellUpdate(BaseModel):
    sheet_name: str
    cell: str
    value: str

class SheetCreate(BaseModel):
    name: str

class SpreadsheetCreate(BaseModel):
    name: Optional[str] = "New Spreadsheet"

class CommandResponse(BaseModel):
    success: bool
    message: str
    action: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

def parse_cell_reference(cell_ref: str) -> tuple:
    """Parse cell reference like A1 into column letter and row number."""
    match = re.match(r'([A-Za-z]+)(\d+)', cell_ref)
    if match:
        return match.group(1).upper(), int(match.group(2))
    return None, None

def parse_natural_language_command(command: str, workbook: openpyxl.Workbook, active_sheet_name: str) -> Dict[str, Any]:
    """Parse natural language command and return action details."""
    command_lower = command.lower().strip()
    
    # Get active sheet
    if active_sheet_name in workbook.sheetnames:
        sheet = workbook[active_sheet_name]
    else:
        sheet = workbook.active
    
    # Pattern: Set/Put value in cell
    # Examples: "set A1 to Hello", "put 100 in B2", "write Hello World in C3"
    set_patterns = [
        r"(?:set|put|write|enter|type)\s+(?:cell\s+)?([a-z]+\d+)\s+(?:to|as|=)\s+(.+)",
        r"(?:set|put|write|enter|type)\s+(.+)\s+(?:in|into|at)\s+(?:cell\s+)?([a-z]+\d+)",
        r"(?:cell\s+)?([a-z]+\d+)\s+(?:=|equals?|is)\s+(.+)",
    ]
    
    for pattern in set_patterns:
        match = re.search(pattern, command_lower)
        if match:
            groups = match.groups()
            if pattern == set_patterns[1]:
                value, cell = groups
            else:
                cell, value = groups
            col, row = parse_cell_reference(cell)
            if col and row:
                return {
                    "action": "set_cell",
                    "cell": f"{col}{row}",
                    "value": value.strip(),
                    "sheet": active_sheet_name
                }
    
    # Pattern: Sum column/range
    # Examples: "sum column A", "calculate sum of A1 to A10", "add up column B"
    sum_patterns = [
        r"(?:sum|add up|total)\s+(?:column\s+)?([a-z])",
        r"(?:sum|add up|total)\s+(?:from\s+)?([a-z]+\d+)\s+(?:to|through)\s+([a-z]+\d+)",
        r"(?:calculate\s+)?(?:the\s+)?sum\s+(?:of\s+)?(?:column\s+)?([a-z])",
    ]
    
    for pattern in sum_patterns:
        match = re.search(pattern, command_lower)
        if match:
            groups = match.groups()
            if len(groups) == 2:
                start_cell, end_cell = groups
                return {
                    "action": "formula",
                    "formula_type": "SUM",
                    "range": f"{start_cell.upper()}:{end_cell.upper()}",
                    "sheet": active_sheet_name
                }
            else:
                col = groups[0].upper()
                return {
                    "action": "formula",
                    "formula_type": "SUM",
                    "column": col,
                    "sheet": active_sheet_name
                }
    
    # Pattern: Average
    # Examples: "average of column B", "calculate average B1 to B10"
    avg_patterns = [
        r"(?:average|avg|mean)\s+(?:of\s+)?(?:column\s+)?([a-z])",
        r"(?:average|avg|mean)\s+(?:from\s+)?([a-z]+\d+)\s+(?:to|through)\s+([a-z]+\d+)",
    ]
    
    for pattern in avg_patterns:
        match = re.search(pattern, command_lower)
        if match:
            groups = match.groups()
            if len(groups) == 2:
                start_cell, end_cell = groups
                return {
                    "action": "formula",
                    "formula_type": "AVERAGE",
                    "range": f"{start_cell.upper()}:{end_cell.upper()}",
                    "sheet": active_sheet_name
                }
            else:
                col = groups[0].upper()
                return {
                    "action": "formula",
                    "formula_type": "AVERAGE",
                    "column": col,
                    "sheet": active_sheet_name
                }
    
    # Pattern: Make bold
    # Examples: "make row 1 bold", "bold A1", "make cell B2 bold"
    bold_patterns = [
        r"(?:make\s+)?(?:row\s+)?(\d+)\s+bold",
        r"(?:make\s+)?(?:cell\s+)?([a-z]+\d+)\s+bold",
        r"bold\s+(?:row\s+)?(\d+)",
        r"bold\s+(?:cell\s+)?([a-z]+\d+)",
    ]
    
    for pattern in bold_patterns:
        match = re.search(pattern, command_lower)
        if match:
            target = match.group(1)
            if target.isdigit():
                return {
                    "action": "format",
                    "format_type": "bold",
                    "row": int(target),
                    "sheet": active_sheet_name
                }
            else:
                return {
                    "action": "format",
                    "format_type": "bold",
                    "cell": target.upper(),
                    "sheet": active_sheet_name
                }
    
    # Pattern: Add new sheet
    # Examples: "add sheet Sales", "create new sheet called Budget", "new sheet named Data"
    sheet_patterns = [
        r"(?:add|create|new)\s+(?:a\s+)?(?:new\s+)?sheet\s+(?:called|named)?\s*(.+)",
        r"(?:add|create)\s+(.+)\s+sheet",
    ]
    
    for pattern in sheet_patterns:
        match = re.search(pattern, command_lower)
        if match:
            sheet_name = match.group(1).strip()
            return {
                "action": "add_sheet",
                "name": sheet_name.title()
            }
    
    # Pattern: Delete column/row
    # Examples: "delete column C", "remove row 5"
    delete_patterns = [
        r"(?:delete|remove)\s+column\s+([a-z])",
        r"(?:delete|remove)\s+row\s+(\d+)",
    ]
    
    for pattern in delete_patterns:
        match = re.search(pattern, command_lower)
        if match:
            target = match.group(1)
            if target.isdigit():
                return {
                    "action": "delete_row",
                    "row": int(target),
                    "sheet": active_sheet_name
                }
            else:
                return {
                    "action": "delete_column",
                    "column": target.upper(),
                    "sheet": active_sheet_name
                }
    
    # Pattern: Clear cell
    # Examples: "clear A1", "erase cell B2"
    clear_pattern = r"(?:clear|erase|empty)\s+(?:cell\s+)?([a-z]+\d+)"
    match = re.search(clear_pattern, command_lower)
    if match:
        cell = match.group(1).upper()
        return {
            "action": "clear_cell",
            "cell": cell,
            "sheet": active_sheet_name
        }
    
    # Pattern: Read cell
    # Examples: "what is in A1", "read cell B2", "show me C3"
    read_patterns = [
        r"(?:what(?:'s| is)?\s+(?:in|at)\s+)?(?:cell\s+)?([a-z]+\d+)",
        r"(?:read|show|get)\s+(?:me\s+)?(?:cell\s+)?([a-z]+\d+)",
    ]
    
    for pattern in read_patterns:
        match = re.search(pattern, command_lower)
        if match:
            cell = match.group(1).upper()
            return {
                "action": "read_cell",
                "cell": cell,
                "sheet": active_sheet_name
            }
    
    # Pattern: Insert row/column
    # Examples: "insert row at 5", "add column after B"
    insert_patterns = [
        r"(?:insert|add)\s+(?:a\s+)?row\s+(?:at|before)\s+(\d+)",
        r"(?:insert|add)\s+(?:a\s+)?column\s+(?:at|before|after)\s+([a-z])",
    ]
    
    for pattern in insert_patterns:
        match = re.search(pattern, command_lower)
        if match:
            target = match.group(1)
            if target.isdigit():
                return {
                    "action": "insert_row",
                    "row": int(target),
                    "sheet": active_sheet_name
                }
            else:
                return {
                    "action": "insert_column",
                    "column": target.upper(),
                    "sheet": active_sheet_name
                }
    
    # Pattern: Count
    count_pattern = r"(?:count)\s+(?:column\s+)?([a-z])"
    match = re.search(count_pattern, command_lower)
    if match:
        col = match.group(1).upper()
        return {
            "action": "formula",
            "formula_type": "COUNT",
            "column": col,
            "sheet": active_sheet_name
        }
    
    return {"action": "unknown", "original_command": command}

def execute_command(action: Dict[str, Any], workbook: openpyxl.Workbook, spreadsheet_id: str) -> CommandResponse:
    """Execute the parsed command on the workbook."""
    try:
        action_type = action.get("action")
        sheet_name = action.get("sheet", workbook.active.title)
        
        if sheet_name in workbook.sheetnames:
            sheet = workbook[sheet_name]
        else:
            sheet = workbook.active
        
        if action_type == "set_cell":
            cell = action["cell"]
            value = action["value"]
            # Try to convert to number if possible
            try:
                if '.' in value:
                    value = float(value)
                else:
                    value = int(value)
            except ValueError:
                pass
            sheet[cell] = value
            save_workbook(spreadsheet_id, workbook)
            return CommandResponse(
                success=True,
                message=f"Set {cell} to '{action['value']}'",
                action="set_cell",
                data={"cell": cell, "value": action["value"]}
            )
        
        elif action_type == "formula":
            formula_type = action["formula_type"]
            if "range" in action:
                range_ref = action["range"]
                # Find next empty cell in the first column of the range
                start_col = range_ref.split(":")[0][0]
                result_row = sheet.max_row + 1
                result_cell = f"{start_col}{result_row}"
                sheet[result_cell] = f"={formula_type}({range_ref})"
            else:
                col = action["column"]
                # Find the range of data in the column
                max_row = 1
                for row in range(1, sheet.max_row + 1):
                    if sheet[f"{col}{row}"].value is not None:
                        max_row = row
                result_cell = f"{col}{max_row + 1}"
                sheet[result_cell] = f"={formula_type}({col}1:{col}{max_row})"
            
            save_workbook(spreadsheet_id, workbook)
            return CommandResponse(
                success=True,
                message=f"Added {formula_type} formula in {result_cell}",
                action="formula",
                data={"cell": result_cell, "formula": formula_type}
            )
        
        elif action_type == "format":
            format_type = action["format_type"]
            if format_type == "bold":
                if "row" in action:
                    row = action["row"]
                    for col in range(1, sheet.max_column + 1):
                        cell = sheet.cell(row=row, column=col)
                        cell.font = Font(bold=True)
                    save_workbook(spreadsheet_id, workbook)
                    return CommandResponse(
                        success=True,
                        message=f"Made row {row} bold",
                        action="format",
                        data={"row": row, "format": "bold"}
                    )
                elif "cell" in action:
                    cell_ref = action["cell"]
                    sheet[cell_ref].font = Font(bold=True)
                    save_workbook(spreadsheet_id, workbook)
                    return CommandResponse(
                        success=True,
                        message=f"Made cell {cell_ref} bold",
                        action="format",
                        data={"cell": cell_ref, "format": "bold"}
                    )
        
        elif action_type == "add_sheet":
            name = action["name"]
            if name in workbook.sheetnames:
                return CommandResponse(
                    success=False,
                    message=f"Sheet '{name}' already exists",
                    action="add_sheet"
                )
            workbook.create_sheet(name)
            save_workbook(spreadsheet_id, workbook)
            return CommandResponse(
                success=True,
                message=f"Created new sheet '{name}'",
                action="add_sheet",
                data={"sheet_name": name}
            )
        
        elif action_type == "delete_column":
            col = action["column"]
            col_idx = column_index_from_string(col)
            sheet.delete_cols(col_idx)
            save_workbook(spreadsheet_id, workbook)
            return CommandResponse(
                success=True,
                message=f"Deleted column {col}",
                action="delete_column",
                data={"column": col}
            )
        
        elif action_type == "delete_row":
            row = action["row"]
            sheet.delete_rows(row)
            save_workbook(spreadsheet_id, workbook)
            return CommandResponse(
                success=True,
                message=f"Deleted row {row}",
                action="delete_row",
                data={"row": row}
            )
        
        elif action_type == "clear_cell":
            cell = action["cell"]
            sheet[cell] = None
            save_workbook(spreadsheet_id, workbook)
            return CommandResponse(
                success=True,
                message=f"Cleared cell {cell}",
                action="clear_cell",
                data={"cell": cell}
            )
        
        elif action_type == "read_cell":
            cell = action["cell"]
            value = sheet[cell].value
            return CommandResponse(
                success=True,
                message=f"Cell {cell} contains: {value}",
                action="read_cell",
                data={"cell": cell, "value": value}
            )
        
        elif action_type == "insert_row":
            row = action["row"]
            sheet.insert_rows(row)
            save_workbook(spreadsheet_id, workbook)
            return CommandResponse(
                success=True,
                message=f"Inserted row at position {row}",
                action="insert_row",
                data={"row": row}
            )
        
        elif action_type == "insert_column":
            col = action["column"]
            col_idx = column_index_from_string(col)
            sheet.insert_cols(col_idx)
            save_workbook(spreadsheet_id, workbook)
            return CommandResponse(
                success=True,
                message=f"Inserted column at position {col}",
                action="insert_column",
                data={"column": col}
            )
        
        elif action_type == "unknown":
            return CommandResponse(
                success=False,
                message=f"I didn't understand that command. Try something like:\n- 'Set A1 to Hello'\n- 'Put 100 in B2'\n- 'Sum column A'\n- 'Make row 1 bold'\n- 'Add sheet called Sales'",
                action="unknown"
            )
        
        return CommandResponse(
            success=False,
            message="Command not implemented yet",
            action=action_type
        )
    
    except Exception as e:
        return CommandResponse(
            success=False,
            message=f"Error executing command: {str(e)}",
            action=action.get("action")
        )

def save_workbook(spreadsheet_id: str, workbook: openpyxl.Workbook):
    """Save workbook to file and update in-memory storage."""
    file_path = os.path.join(TEMP_DIR, f"{spreadsheet_id}.xlsx")
    workbook.save(file_path)
    spreadsheets[spreadsheet_id]["file_path"] = file_path

def get_spreadsheet_data(workbook: openpyxl.Workbook) -> Dict[str, Any]:
    """Extract spreadsheet data for frontend display."""
    sheets_data = {}
    for sheet_name in workbook.sheetnames:
        sheet = workbook[sheet_name]
        cells = {}
        for row in range(1, min(sheet.max_row + 1, 101)):  # Limit to 100 rows
            for col in range(1, min(sheet.max_column + 1, 27)):  # Limit to 26 columns
                cell = sheet.cell(row=row, column=col)
                if cell.value is not None:
                    cell_ref = f"{get_column_letter(col)}{row}"
                    cells[cell_ref] = {
                        "value": cell.value,
                        "formula": cell.value if str(cell.value).startswith("=") else None,
                        "bold": cell.font.bold if cell.font else False
                    }
        sheets_data[sheet_name] = {
            "cells": cells,
            "max_row": min(sheet.max_row, 100),
            "max_column": min(sheet.max_column, 26)
        }
    return sheets_data

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/api/spreadsheet/create")
async def create_spreadsheet(data: SpreadsheetCreate):
    """Create a new empty spreadsheet."""
    spreadsheet_id = str(uuid.uuid4())
    workbook = openpyxl.Workbook()
    workbook.active.title = "Sheet1"
    
    file_path = os.path.join(TEMP_DIR, f"{spreadsheet_id}.xlsx")
    workbook.save(file_path)
    
    spreadsheets[spreadsheet_id] = {
        "id": spreadsheet_id,
        "name": data.name,
        "file_path": file_path,
        "active_sheet": "Sheet1"
    }
    
    return {
        "id": spreadsheet_id,
        "name": data.name,
        "sheets": ["Sheet1"],
        "data": get_spreadsheet_data(workbook)
    }

@app.post("/api/spreadsheet/upload")
async def upload_spreadsheet(file: UploadFile = File(...)):
    """Upload an existing Excel file."""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported")
    
    spreadsheet_id = str(uuid.uuid4())
    file_path = os.path.join(TEMP_DIR, f"{spreadsheet_id}.xlsx")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        workbook = openpyxl.load_workbook(file_path)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Invalid Excel file: {str(e)}")
    
    spreadsheets[spreadsheet_id] = {
        "id": spreadsheet_id,
        "name": file.filename,
        "file_path": file_path,
        "active_sheet": workbook.active.title
    }
    
    return {
        "id": spreadsheet_id,
        "name": file.filename,
        "sheets": workbook.sheetnames,
        "data": get_spreadsheet_data(workbook)
    }

@app.get("/api/spreadsheet/{spreadsheet_id}")
async def get_spreadsheet(spreadsheet_id: str):
    """Get spreadsheet data."""
    if spreadsheet_id not in spreadsheets:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")
    
    spreadsheet = spreadsheets[spreadsheet_id]
    workbook = openpyxl.load_workbook(spreadsheet["file_path"])
    
    return {
        "id": spreadsheet_id,
        "name": spreadsheet["name"],
        "sheets": workbook.sheetnames,
        "active_sheet": spreadsheet["active_sheet"],
        "data": get_spreadsheet_data(workbook)
    }

@app.get("/api/spreadsheet/{spreadsheet_id}/download")
async def download_spreadsheet(spreadsheet_id: str):
    """Download the spreadsheet as an Excel file."""
    if spreadsheet_id not in spreadsheets:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")
    
    spreadsheet = spreadsheets[spreadsheet_id]
    return FileResponse(
        spreadsheet["file_path"],
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"{spreadsheet['name']}.xlsx"
    )

@app.post("/api/spreadsheet/{spreadsheet_id}/command")
async def process_command(spreadsheet_id: str, request: CommandRequest):
    """Process a natural language command."""
    if spreadsheet_id not in spreadsheets:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")
    
    spreadsheet = spreadsheets[spreadsheet_id]
    workbook = openpyxl.load_workbook(spreadsheet["file_path"])
    
    # Parse the command
    action = parse_natural_language_command(
        request.command, 
        workbook, 
        spreadsheet["active_sheet"]
    )
    
    # Execute the command
    result = execute_command(action, workbook, spreadsheet_id)
    
    # Get updated spreadsheet data
    if result.success:
        workbook = openpyxl.load_workbook(spreadsheet["file_path"])
        result.data = result.data or {}
        result.data["spreadsheet"] = get_spreadsheet_data(workbook)
    
    return result

@app.put("/api/spreadsheet/{spreadsheet_id}/cell")
async def update_cell(spreadsheet_id: str, update: CellUpdate):
    """Directly update a cell value."""
    if spreadsheet_id not in spreadsheets:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")
    
    spreadsheet = spreadsheets[spreadsheet_id]
    workbook = openpyxl.load_workbook(spreadsheet["file_path"])
    
    if update.sheet_name not in workbook.sheetnames:
        raise HTTPException(status_code=400, detail=f"Sheet '{update.sheet_name}' not found")
    
    sheet = workbook[update.sheet_name]
    
    # Try to convert to number
    value = update.value
    try:
        if '.' in value:
            value = float(value)
        else:
            value = int(value)
    except ValueError:
        pass
    
    sheet[update.cell] = value
    save_workbook(spreadsheet_id, workbook)
    
    return {
        "success": True,
        "cell": update.cell,
        "value": update.value,
        "data": get_spreadsheet_data(workbook)
    }

@app.post("/api/spreadsheet/{spreadsheet_id}/sheet")
async def add_sheet(spreadsheet_id: str, sheet: SheetCreate):
    """Add a new sheet to the spreadsheet."""
    if spreadsheet_id not in spreadsheets:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")
    
    spreadsheet = spreadsheets[spreadsheet_id]
    workbook = openpyxl.load_workbook(spreadsheet["file_path"])
    
    if sheet.name in workbook.sheetnames:
        raise HTTPException(status_code=400, detail=f"Sheet '{sheet.name}' already exists")
    
    workbook.create_sheet(sheet.name)
    save_workbook(spreadsheet_id, workbook)
    
    return {
        "success": True,
        "sheets": workbook.sheetnames,
        "data": get_spreadsheet_data(workbook)
    }

@app.put("/api/spreadsheet/{spreadsheet_id}/active-sheet")
async def set_active_sheet(spreadsheet_id: str, sheet_name: str):
    """Set the active sheet."""
    if spreadsheet_id not in spreadsheets:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")
    
    spreadsheet = spreadsheets[spreadsheet_id]
    workbook = openpyxl.load_workbook(spreadsheet["file_path"])
    
    if sheet_name not in workbook.sheetnames:
        raise HTTPException(status_code=400, detail=f"Sheet '{sheet_name}' not found")
    
    spreadsheets[spreadsheet_id]["active_sheet"] = sheet_name
    
    return {
        "success": True,
        "active_sheet": sheet_name
    }

@app.get("/api/commands/help")
async def get_command_help():
    """Get list of supported voice commands."""
    return {
        "commands": [
            {
                "category": "Setting Values",
                "examples": [
                    "Set A1 to Hello",
                    "Put 100 in B2",
                    "Write Hello World in C3",
                    "A1 equals 50"
                ]
            },
            {
                "category": "Formulas",
                "examples": [
                    "Sum column A",
                    "Calculate sum of A1 to A10",
                    "Average of column B",
                    "Count column C"
                ]
            },
            {
                "category": "Formatting",
                "examples": [
                    "Make row 1 bold",
                    "Bold cell A1"
                ]
            },
            {
                "category": "Sheets",
                "examples": [
                    "Add sheet called Sales",
                    "Create new sheet named Budget"
                ]
            },
            {
                "category": "Editing",
                "examples": [
                    "Delete column C",
                    "Remove row 5",
                    "Clear A1",
                    "Insert row at 3"
                ]
            },
            {
                "category": "Reading",
                "examples": [
                    "What is in A1",
                    "Read cell B2",
                    "Show me C3"
                ]
            }
        ]
    }

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe an audio file to text using speech recognition."""
    try:
        # Read the uploaded file
        content = await file.read()
        
        # Save to temp file
        temp_audio_path = os.path.join(TEMP_DIR, f"audio_{uuid.uuid4()}")
        original_ext = os.path.splitext(file.filename or "audio.wav")[1].lower()
        temp_original = temp_audio_path + original_ext
        
        with open(temp_original, "wb") as f:
            f.write(content)
        
        # Convert to WAV if needed (pydub handles various formats)
        temp_wav = temp_audio_path + ".wav"
        try:
            if original_ext in ['.mp3', '.m4a', '.ogg', '.flac', '.aac', '.wma']:
                audio = AudioSegment.from_file(temp_original)
                audio.export(temp_wav, format="wav")
            elif original_ext == '.wav':
                temp_wav = temp_original
            else:
                # Try to convert anyway
                audio = AudioSegment.from_file(temp_original)
                audio.export(temp_wav, format="wav")
        except Exception as conv_err:
            # If conversion fails, try using the original file
            temp_wav = temp_original
        
        # Use speech recognition
        recognizer = sr.Recognizer()
        
        with sr.AudioFile(temp_wav) as source:
            audio_data = recognizer.record(source)
        
        # Try Google's free speech recognition
        try:
            text = recognizer.recognize_google(audio_data)
        except sr.UnknownValueError:
            return {
                "success": False,
                "error": "Could not understand the audio. Please speak clearly and try again.",
                "transcript": None
            }
        except sr.RequestError as e:
            return {
                "success": False,
                "error": f"Speech recognition service error: {str(e)}",
                "transcript": None
            }
        
        # Clean up temp files
        try:
            if os.path.exists(temp_original):
                os.remove(temp_original)
            if temp_wav != temp_original and os.path.exists(temp_wav):
                os.remove(temp_wav)
        except Exception:
            pass
        
        return {
            "success": True,
            "transcript": text,
            "error": None
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to process audio: {str(e)}",
            "transcript": None
        }

@app.post("/api/spreadsheet/{spreadsheet_id}/voice-command")
async def process_voice_command(spreadsheet_id: str, file: UploadFile = File(...)):
    """Transcribe audio and execute the command on the spreadsheet."""
    if spreadsheet_id not in spreadsheets:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")
    
    # First transcribe the audio
    transcribe_result = await transcribe_audio(file)
    
    if not transcribe_result["success"]:
        return {
            "success": False,
            "message": transcribe_result["error"],
            "transcript": None,
            "data": None
        }
    
    transcript = transcribe_result["transcript"]
    
    # Now process the command
    spreadsheet = spreadsheets[spreadsheet_id]
    workbook = openpyxl.load_workbook(spreadsheet["file_path"])
    
    # Parse the command
    action = parse_natural_language_command(
        transcript, 
        workbook, 
        spreadsheet["active_sheet"]
    )
    
    # Execute the command
    result = execute_command(action, workbook, spreadsheet_id)
    
    # Get updated spreadsheet data
    if result.success:
        workbook = openpyxl.load_workbook(spreadsheet["file_path"])
        result.data = result.data or {}
        result.data["spreadsheet"] = get_spreadsheet_data(workbook)
    
    return {
        "success": result.success,
        "message": result.message,
        "transcript": transcript,
        "action": result.action,
        "data": result.data
    }


# AI Agent instances per spreadsheet
ai_agents: Dict[str, ExcelAIAgent] = {}

# Web search function using DuckDuckGo
async def web_search(query: str) -> List[Dict[str, str]]:
    """Search the web using DuckDuckGo."""
    try:
        async with httpx.AsyncClient() as client:
            # Use DuckDuckGo instant answer API
            response = await client.get(
                "https://api.duckduckgo.com/",
                params={
                    "q": query,
                    "format": "json",
                    "no_html": 1,
                    "skip_disambig": 1
                },
                timeout=10.0
            )
            data = response.json()
            
            results = []
            
            # Get abstract if available
            if data.get("Abstract"):
                results.append({
                    "title": data.get("Heading", "Result"),
                    "snippet": data["Abstract"],
                    "source": data.get("AbstractSource", "DuckDuckGo")
                })
            
            # Get related topics
            for topic in data.get("RelatedTopics", [])[:5]:
                if isinstance(topic, dict) and topic.get("Text"):
                    results.append({
                        "title": topic.get("FirstURL", "").split("/")[-1].replace("_", " "),
                        "snippet": topic["Text"],
                        "source": "DuckDuckGo"
                    })
            
            # If no results, try a simple search
            if not results:
                results.append({
                    "title": "Search",
                    "snippet": f"No direct results found for '{query}'. Try rephrasing your search.",
                    "source": "DuckDuckGo"
                })
            
            return results
    except Exception as e:
        return [{"title": "Error", "snippet": f"Search failed: {str(e)}", "source": "Error"}]


class AICommandRequest(BaseModel):
    command: str


@app.post("/api/spreadsheet/{spreadsheet_id}/ai-command")
async def process_ai_command(spreadsheet_id: str, request: AICommandRequest):
    """Process a command using the AI agent with Claude."""
    if spreadsheet_id not in spreadsheets:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")
    
    # Get or create AI agent for this spreadsheet
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {
            "success": False,
            "message": "AI features require an Anthropic API key. Please configure ANTHROPIC_API_KEY.",
            "data": None
        }
    
    if spreadsheet_id not in ai_agents:
        try:
            ai_agents[spreadsheet_id] = ExcelAIAgent(api_key=api_key)
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to initialize AI agent: {str(e)}",
                "data": None
            }
    
    agent = ai_agents[spreadsheet_id]
    spreadsheet = spreadsheets[spreadsheet_id]
    
    # Load workbook
    try:
        workbook = openpyxl.load_workbook(spreadsheet["file_path"])
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to load spreadsheet: {str(e)}",
            "data": None
        }
    
    # Process command with AI
    try:
        result = agent.process_command(
            command=request.command,
            workbook=workbook,
            active_sheet_name=spreadsheet["active_sheet"],
            web_search_func=lambda q: __import__('asyncio').get_event_loop().run_until_complete(web_search(q))
        )
    except Exception as e:
        return {
            "success": False,
            "message": f"AI processing error: {str(e)}",
            "data": None
        }
    
    # Save workbook if any actions were taken
    if result.get("actions"):
        try:
            save_workbook(spreadsheet_id, workbook)
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to save changes: {str(e)}",
                "data": None
            }
    
    # Get updated spreadsheet data
    try:
        workbook = openpyxl.load_workbook(spreadsheet["file_path"])
        spreadsheet_data = get_spreadsheet_data(workbook)
    except Exception as e:
        spreadsheet_data = None
    
    return {
        "success": result.get("success", False),
        "message": result.get("message", ""),
        "actions": result.get("actions", []),
        "data": {
            "spreadsheet": spreadsheet_data
        } if spreadsheet_data else None
    }


@app.post("/api/spreadsheet/{spreadsheet_id}/ai-voice-command")
async def process_ai_voice_command(spreadsheet_id: str, file: UploadFile = File(...)):
    """Transcribe audio and process with AI agent."""
    if spreadsheet_id not in spreadsheets:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")
    
    # First transcribe the audio
    transcribe_result = await transcribe_audio(file)
    
    if not transcribe_result["success"]:
        return {
            "success": False,
            "message": transcribe_result["error"],
            "transcript": None,
            "data": None
        }
    
    transcript = transcribe_result["transcript"]
    
    # Process with AI agent
    ai_request = AICommandRequest(command=transcript)
    result = await process_ai_command(spreadsheet_id, ai_request)
    
    return {
        "success": result["success"],
        "message": result["message"],
        "transcript": transcript,
        "actions": result.get("actions", []),
        "data": result.get("data")
    }


@app.delete("/api/spreadsheet/{spreadsheet_id}/ai-history")
async def clear_ai_history(spreadsheet_id: str):
    """Clear the AI conversation history for a spreadsheet."""
    if spreadsheet_id in ai_agents:
        ai_agents[spreadsheet_id].clear_history()
    return {"success": True, "message": "AI conversation history cleared"}
