#!/usr/bin/env node
/**
 * Damp portfolio CLI.
 *
 * Runs on bare Node — v24 strips the types, and `package.json` already maps
 * `#/*` to `./src/*` as a real subpath import, so this shares the generator
 * with the app without a build step, a bundler or a watcher.
 */

import { defineCommand, runMain } from 'citty'
import { create, runCreate } from './commands/create.ts'
import { inspect } from './commands/inspect.ts'

const main = defineCommand({
  meta: {
    name: 'damp',
    version: '0.1.0',
    description: 'Generate, inspect and snapshot simulated IoT damp data',
  },
  subCommands: {
    inspect,
    create,
  },
  // No subcommand means no flags to remember — drop into the wizard.
  run: ({ args }) => (args._.length === 0 ? runCreate() : undefined),
})

void runMain(main)
