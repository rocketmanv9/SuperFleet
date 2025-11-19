import { createContext, useContext } from 'react'

const OrgContext = createContext({ organization: null })

function OrgProvider({ organization, children }) {
  return <OrgContext.Provider value={{ organization }}>{children}</OrgContext.Provider>
}

function useActiveOrg() {
  return useContext(OrgContext).organization
}

export { OrgProvider, useActiveOrg }
