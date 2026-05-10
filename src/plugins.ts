// Built-in plugins — import this to auto-register http, stdio, authenticated
export { httpPlugin } from './http/index.js'
export { stdioPlugin } from './stdio/index.js'
export { authenticatedPlugin } from './authenticated/index.js'

import { registry } from './registry.js'
import { httpPlugin } from './http/index.js'
import { stdioPlugin } from './stdio/index.js'
import { authenticatedPlugin } from './authenticated/index.js'

registry.register(httpPlugin)
registry.register(stdioPlugin)
registry.register(authenticatedPlugin)
