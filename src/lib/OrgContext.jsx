import { createContext } from 'react'

const OrgContext = createContext({ organization: null })

function OrgProvider({ organization, children }) {
  return <OrgContext.Provider value={{ organization }}>{children}</OrgContext.Provider>
}

export { OrgContext, OrgProvider }
