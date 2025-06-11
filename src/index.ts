#!/usr/bin/env node

import { runCli } from "./cli/main.js";

// Run the CLI with command line arguments
runCli(process.argv.slice(2));
