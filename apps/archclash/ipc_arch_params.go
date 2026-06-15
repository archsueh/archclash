package main

// archIPCStartParams is the JSON body shape for POST /clash/start on the Arch Windows IPC service.
type archIPCStartParams struct {
	CorePath     string
	ConfigPath   string
	ConfigDir    string
	CoreIpcPath  string
	LogDirectory string
}
