'use client'

import { useEffect } from 'react'

let initialized = false

export function SuperTokensProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const init = async () => {
      const appName = process.env.NEXT_PUBLIC_SUPERTOKENS_APP_NAME || 'Hyperplacity AI Workers'
      const apiDomain = process.env.NEXT_PUBLIC_SUPERTOKENS_API_DOMAIN
      const websiteDomain = process.env.NEXT_PUBLIC_SUPERTOKENS_WEBSITE_DOMAIN

      if (!apiDomain || !websiteDomain || initialized) return

      try {
        const supertokensModule = await import('supertokens-auth-react')
        const emailPasswordModule = await import('supertokens-auth-react/recipe/emailpassword')
        const sessionModule = await import('supertokens-auth-react/recipe/session')

        supertokensModule.default.init({
          appInfo: {
            appName,
            apiDomain,
            websiteDomain,
            apiBasePath: '/api/auth',
            websiteBasePath: '/auth',
          },
          recipeList: [emailPasswordModule.default.init(), sessionModule.default.init()],
        })
        initialized = true
      } catch {
        initialized = false
      }
    }

    init()
  }, [])

  return <>{children}</>
}
