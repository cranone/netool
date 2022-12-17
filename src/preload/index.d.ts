export interface IElectronAPI {
  request: (
    options: string | Electron.ClientRequestConstructorOptions,
    chunk: string,
    headers: string
  ) => Promise<void>
  response: (callback) => Promise<void>
}

//import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    //electron: ElectronAPI
    api: IElectronAPI
    versions: NodeJS.ProcessVersions
  }
}
