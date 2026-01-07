"""
AI Agent powered by Claude for intelligent Excel operations.
Provides natural language understanding, reasoning, and tool use.
"""

import anthropic
import json
import os
from typing import Dict, Any, List, Optional
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter, column_index_from_string
import re

# Initialize Anthropic client from environment variable
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# Define tools for the AI agent
EXCEL_TOOLS = [
    {
        "name": "set_cell_value",
        "description": "Set a value in a specific cell. Use this to put text, numbers, or formulas in cells.",
        "input_schema": {
            "type": "object",
            "properties": {
                "cell": {
                    "type": "string",
                    "description": "Cell reference like A1, B2, C10, etc."
                },
                "value": {
                    "type": "string",
                    "description": "The value to set. Can be text, number, or formula (formulas start with =)"
                },
                "sheet_name": {
                    "type": "string",
                    "description": "Optional sheet name. Uses active sheet if not specified."
                }
            },
            "required": ["cell", "value"]
        }
    },
    {
        "name": "get_cell_value",
        "description": "Read the value from a specific cell.",
        "input_schema": {
            "type": "object",
            "properties": {
                "cell": {
                    "type": "string",
                    "description": "Cell reference like A1, B2, etc."
                },
                "sheet_name": {
                    "type": "string",
                    "description": "Optional sheet name."
                }
            },
            "required": ["cell"]
        }
    },
    {
        "name": "set_multiple_cells",
        "description": "Set values in multiple cells at once. Efficient for filling ranges or creating tables.",
        "input_schema": {
            "type": "object",
            "properties": {
                "cells": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "cell": {"type": "string"},
                            "value": {"type": "string"}
                        },
                        "required": ["cell", "value"]
                    },
                    "description": "Array of cell-value pairs"
                },
                "sheet_name": {
                    "type": "string",
                    "description": "Optional sheet name."
                }
            },
            "required": ["cells"]
        }
    },
    {
        "name": "format_cells",
        "description": "Apply formatting to cells (bold, italic, colors, alignment).",
        "input_schema": {
            "type": "object",
            "properties": {
                "range": {
                    "type": "string",
                    "description": "Cell range like A1, A1:B5, or 1 for entire row"
                },
                "bold": {"type": "boolean", "description": "Make text bold"},
                "italic": {"type": "boolean", "description": "Make text italic"},
                "font_size": {"type": "integer", "description": "Font size in points"},
                "font_color": {"type": "string", "description": "Font color as hex (e.g., FF0000 for red)"},
                "bg_color": {"type": "string", "description": "Background color as hex"},
                "align": {"type": "string", "enum": ["left", "center", "right"], "description": "Text alignment"},
                "sheet_name": {"type": "string"}
            },
            "required": ["range"]
        }
    },
    {
        "name": "add_formula",
        "description": "Add an Excel formula to a cell. Supports SUM, AVERAGE, COUNT, IF, VLOOKUP, etc.",
        "input_schema": {
            "type": "object",
            "properties": {
                "cell": {
                    "type": "string",
                    "description": "Cell to put the formula in"
                },
                "formula": {
                    "type": "string",
                    "description": "Excel formula starting with = (e.g., =SUM(A1:A10), =AVERAGE(B1:B5))"
                },
                "sheet_name": {"type": "string"}
            },
            "required": ["cell", "formula"]
        }
    },
    {
        "name": "create_sheet",
        "description": "Create a new sheet in the spreadsheet.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name for the new sheet"
                }
            },
            "required": ["name"]
        }
    },
    {
        "name": "delete_sheet",
        "description": "Delete a sheet from the spreadsheet.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name of the sheet to delete"
                }
            },
            "required": ["name"]
        }
    },
    {
        "name": "insert_row",
        "description": "Insert a new row at the specified position.",
        "input_schema": {
            "type": "object",
            "properties": {
                "row": {
                    "type": "integer",
                    "description": "Row number where to insert (1-indexed)"
                },
                "sheet_name": {"type": "string"}
            },
            "required": ["row"]
        }
    },
    {
        "name": "insert_column",
        "description": "Insert a new column at the specified position.",
        "input_schema": {
            "type": "object",
            "properties": {
                "column": {
                    "type": "string",
                    "description": "Column letter where to insert (e.g., A, B, C)"
                },
                "sheet_name": {"type": "string"}
            },
            "required": ["column"]
        }
    },
    {
        "name": "delete_row",
        "description": "Delete a row from the spreadsheet.",
        "input_schema": {
            "type": "object",
            "properties": {
                "row": {
                    "type": "integer",
                    "description": "Row number to delete (1-indexed)"
                },
                "sheet_name": {"type": "string"}
            },
            "required": ["row"]
        }
    },
    {
        "name": "delete_column",
        "description": "Delete a column from the spreadsheet.",
        "input_schema": {
            "type": "object",
            "properties": {
                "column": {
                    "type": "string",
                    "description": "Column letter to delete (e.g., A, B, C)"
                },
                "sheet_name": {"type": "string"}
            },
            "required": ["column"]
        }
    },
    {
        "name": "get_sheet_data",
        "description": "Get all data from a sheet to understand its current state.",
        "input_schema": {
            "type": "object",
            "properties": {
                "sheet_name": {
                    "type": "string",
                    "description": "Sheet name. Uses active sheet if not specified."
                },
                "max_rows": {
                    "type": "integer",
                    "description": "Maximum rows to return (default 50)"
                },
                "max_cols": {
                    "type": "integer",
                    "description": "Maximum columns to return (default 10)"
                }
            },
            "required": []
        }
    },
    {
        "name": "web_search",
        "description": "Search the web for information. Use this to look up data, facts, or research topics.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "clear_range",
        "description": "Clear values from a range of cells.",
        "input_schema": {
            "type": "object",
            "properties": {
                "range": {
                    "type": "string",
                    "description": "Cell range to clear (e.g., A1:B10)"
                },
                "sheet_name": {"type": "string"}
            },
            "required": ["range"]
        }
    }
]


class ExcelAIAgent:
    """AI Agent that uses Claude to intelligently process Excel commands."""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or ANTHROPIC_API_KEY
        if not self.api_key:
            raise ValueError("Anthropic API key is required")
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.conversation_history: List[Dict] = []
    
    def execute_tool(
        self, 
        tool_name: str, 
        tool_input: Dict[str, Any],
        workbook: openpyxl.Workbook,
        active_sheet_name: str,
        web_search_func=None
    ) -> Dict[str, Any]:
        """Execute a tool and return the result."""
        
        sheet_name = tool_input.get("sheet_name", active_sheet_name)
        if sheet_name in workbook.sheetnames:
            sheet = workbook[sheet_name]
        else:
            sheet = workbook.active
        
        try:
            if tool_name == "set_cell_value":
                cell = tool_input["cell"].upper()
                value = tool_input["value"]
                # Try to convert to number if possible
                try:
                    if '.' in str(value):
                        value = float(value)
                    elif str(value).isdigit() or (str(value).startswith('-') and str(value)[1:].isdigit()):
                        value = int(value)
                except (ValueError, TypeError):
                    pass
                sheet[cell] = value
                return {"success": True, "message": f"Set {cell} to '{tool_input['value']}'"}
            
            elif tool_name == "get_cell_value":
                cell = tool_input["cell"].upper()
                value = sheet[cell].value
                return {"success": True, "value": value, "message": f"Cell {cell} contains: {value}"}
            
            elif tool_name == "set_multiple_cells":
                cells_set = []
                for item in tool_input["cells"]:
                    cell = item["cell"].upper()
                    value = item["value"]
                    try:
                        if '.' in str(value):
                            value = float(value)
                        elif str(value).isdigit():
                            value = int(value)
                    except (ValueError, TypeError):
                        pass
                    sheet[cell] = value
                    cells_set.append(cell)
                return {"success": True, "message": f"Set values in cells: {', '.join(cells_set)}"}
            
            elif tool_name == "format_cells":
                range_str = tool_input["range"]
                
                # Parse range
                if ':' in range_str:
                    start, end = range_str.upper().split(':')
                    cells = sheet[start:end]
                elif range_str.isdigit():
                    # Entire row
                    row = int(range_str)
                    cells = [[sheet.cell(row=row, column=c) for c in range(1, sheet.max_column + 1)]]
                else:
                    cells = [[sheet[range_str.upper()]]]
                
                # Apply formatting
                font_kwargs = {}
                if tool_input.get("bold"):
                    font_kwargs["bold"] = True
                if tool_input.get("italic"):
                    font_kwargs["italic"] = True
                if tool_input.get("font_size"):
                    font_kwargs["size"] = tool_input["font_size"]
                if tool_input.get("font_color"):
                    font_kwargs["color"] = tool_input["font_color"]
                
                for row in cells:
                    for cell in row if isinstance(row, tuple) else [row]:
                        if font_kwargs:
                            cell.font = Font(**font_kwargs)
                        if tool_input.get("bg_color"):
                            cell.fill = PatternFill(start_color=tool_input["bg_color"], 
                                                   end_color=tool_input["bg_color"], 
                                                   fill_type="solid")
                        if tool_input.get("align"):
                            cell.alignment = Alignment(horizontal=tool_input["align"])
                
                return {"success": True, "message": f"Applied formatting to {range_str}"}
            
            elif tool_name == "add_formula":
                cell = tool_input["cell"].upper()
                formula = tool_input["formula"]
                if not formula.startswith("="):
                    formula = "=" + formula
                sheet[cell] = formula
                return {"success": True, "message": f"Added formula {formula} to {cell}"}
            
            elif tool_name == "create_sheet":
                name = tool_input["name"]
                if name in workbook.sheetnames:
                    return {"success": False, "message": f"Sheet '{name}' already exists"}
                workbook.create_sheet(name)
                return {"success": True, "message": f"Created new sheet '{name}'"}
            
            elif tool_name == "delete_sheet":
                name = tool_input["name"]
                if name not in workbook.sheetnames:
                    return {"success": False, "message": f"Sheet '{name}' not found"}
                if len(workbook.sheetnames) == 1:
                    return {"success": False, "message": "Cannot delete the only sheet"}
                del workbook[name]
                return {"success": True, "message": f"Deleted sheet '{name}'"}
            
            elif tool_name == "insert_row":
                row = tool_input["row"]
                sheet.insert_rows(row)
                return {"success": True, "message": f"Inserted row at position {row}"}
            
            elif tool_name == "insert_column":
                col = tool_input["column"].upper()
                col_idx = column_index_from_string(col)
                sheet.insert_cols(col_idx)
                return {"success": True, "message": f"Inserted column at position {col}"}
            
            elif tool_name == "delete_row":
                row = tool_input["row"]
                sheet.delete_rows(row)
                return {"success": True, "message": f"Deleted row {row}"}
            
            elif tool_name == "delete_column":
                col = tool_input["column"].upper()
                col_idx = column_index_from_string(col)
                sheet.delete_cols(col_idx)
                return {"success": True, "message": f"Deleted column {col}"}
            
            elif tool_name == "get_sheet_data":
                max_rows = tool_input.get("max_rows", 50)
                max_cols = tool_input.get("max_cols", 10)
                
                data = {}
                for row in range(1, min(sheet.max_row + 1, max_rows + 1)):
                    for col in range(1, min(sheet.max_column + 1, max_cols + 1)):
                        cell = sheet.cell(row=row, column=col)
                        if cell.value is not None:
                            cell_ref = f"{get_column_letter(col)}{row}"
                            data[cell_ref] = str(cell.value)
                
                return {
                    "success": True, 
                    "data": data,
                    "max_row": sheet.max_row,
                    "max_column": sheet.max_column,
                    "message": f"Retrieved data from sheet (found {len(data)} cells with values)"
                }
            
            elif tool_name == "web_search":
                if web_search_func:
                    results = web_search_func(tool_input["query"])
                    return {"success": True, "results": results, "message": f"Found search results for: {tool_input['query']}"}
                else:
                    return {"success": False, "message": "Web search not available"}
            
            elif tool_name == "clear_range":
                range_str = tool_input["range"].upper()
                if ':' in range_str:
                    start, end = range_str.split(':')
                    for row in sheet[start:end]:
                        for cell in row:
                            cell.value = None
                else:
                    sheet[range_str].value = None
                return {"success": True, "message": f"Cleared range {range_str}"}
            
            else:
                return {"success": False, "message": f"Unknown tool: {tool_name}"}
                
        except Exception as e:
            return {"success": False, "message": f"Error executing {tool_name}: {str(e)}"}
    
    def process_command(
        self,
        command: str,
        workbook: openpyxl.Workbook,
        active_sheet_name: str,
        web_search_func=None
    ) -> Dict[str, Any]:
        """Process a natural language command using Claude."""
        
        # Build system prompt
        system_prompt = """You are an intelligent Excel assistant. You help users work with spreadsheets using natural language.

You have access to tools to manipulate Excel spreadsheets. Use them to fulfill user requests.

Key capabilities:
- Set values in cells (text, numbers, formulas)
- Apply formatting (bold, colors, alignment)
- Create formulas (SUM, AVERAGE, IF, VLOOKUP, etc.)
- Manage sheets (create, delete, rename)
- Insert/delete rows and columns
- Search the web for information to put in the spreadsheet

Guidelines:
1. Always understand the user's intent before acting
2. For complex requests, break them down into steps
3. Use get_sheet_data first if you need to understand the current state
4. Validate your actions make sense
5. Provide clear feedback about what you did
6. If something is unclear, explain what you understood and what you did
7. For data entry tasks, be thorough and accurate
8. Use web_search when you need external information

Current spreadsheet info:
- Active sheet: {active_sheet}
- Available sheets: {sheets}
""".format(
            active_sheet=active_sheet_name,
            sheets=", ".join(workbook.sheetnames)
        )
        
        # Add user message to history
        self.conversation_history.append({
            "role": "user",
            "content": command
        })
        
        # Keep only last 10 messages for context
        messages = self.conversation_history[-10:]
        
        # Call Claude with tools
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                system=system_prompt,
                tools=EXCEL_TOOLS,
                messages=messages
            )
        except Exception as e:
            return {
                "success": False,
                "message": f"AI Error: {str(e)}",
                "actions": []
            }
        
        # Process response
        actions_taken = []
        final_response = ""
        
        # Handle tool use loop
        while response.stop_reason == "tool_use":
            # Extract tool calls
            tool_calls = [block for block in response.content if block.type == "tool_use"]
            tool_results = []
            
            for tool_call in tool_calls:
                result = self.execute_tool(
                    tool_call.name,
                    tool_call.input,
                    workbook,
                    active_sheet_name,
                    web_search_func
                )
                actions_taken.append({
                    "tool": tool_call.name,
                    "input": tool_call.input,
                    "result": result
                })
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_call.id,
                    "content": json.dumps(result)
                })
            
            # Continue conversation with tool results
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
            
            try:
                response = self.client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4096,
                    system=system_prompt,
                    tools=EXCEL_TOOLS,
                    messages=messages
                )
            except Exception as e:
                return {
                    "success": False,
                    "message": f"AI Error during tool execution: {str(e)}",
                    "actions": actions_taken
                }
        
        # Extract final text response
        for block in response.content:
            if hasattr(block, "text"):
                final_response += block.text
        
        # Add assistant response to history
        self.conversation_history.append({
            "role": "assistant",
            "content": final_response
        })
        
        return {
            "success": True,
            "message": final_response,
            "actions": actions_taken
        }
    
    def clear_history(self):
        """Clear conversation history."""
        self.conversation_history = []
