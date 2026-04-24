pi coding agent
===

## Install

Keep everything clean in one folder with no outside dependencies except npm stuff installed in local ./node_modules/ folder.

```bash
# install
cd pi
npm install @mariozechner/pi-coding-agent

# update
npm install @mariozechner/pi-coding-agent

node /app/pi/node_modules/@mariozechner/pi-coding-agent/dist/cli.js --config-dir ./.pi
```

## Configure
All configuration lives in .pi/ subfolder. Setup for llama.cpp endpoints lives in the local-llama extension.

## References
https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent
