# Configuration Management in Buildpack

Buildpack consists of many small tools, but it has larger, overall workflows that a developer has to configure and control. These configurations differ across projects, and within projects across environments: development, testing, staging and production behave differently because they are configured differently.

Like the rest of PWA Studio, Buildpack uses environment variables as its central source of configuration settings. A PWA using Buildpack has a [`.env` file][dotenv] in its root directory. This file contains configuration values as text, line by line, in the form `NAME=value`. In any script in any programming language, you can access these environment variables directly by sourcing the file as a legal POSIX shell script. In NodeJS, use the [configureEnvironment](#configureenvironment) function to populate the environment from the `.env` file and translate it into usable JS objects.

A command, shell script, or spawned subprocess can override individual environment variables at start time. When loading from `.env`, Buildpack will not overwrite variables that have already been declared.

## `configureEnvironment()`

The `Buildpack.configureEnvironment()` function provides a simple, powerful configuration manager. Using `configureEnvironment()`, you can keep global configuration values in a central location and propagate them throughout your project, pushing common settings down to many tools without tightly coupling those tools together.

### Features

- Uses cross-platform environment variables instead of "rc" files
- Reads and sets environment variables from `.env` file
- Allows outer system (scripts, containers, etc) to override any option at runtime
- Validates configuration and emits informative errors and warnings
- Supports, patches, and warns about deprecations and changes in the known variable schema
- Camel cases and namespaces at any level of depth
- Readable shortcuts for `NODE_ENV` values

### Usage

`configureEnvironment(directory)` returns a `Configuration` object. Instead of a plain object of configuration values, the `Configuration` has methods which can quickly create these values and format them for specific uses. Using `Configuration` objects, a project can use a single source of truth for configuration without sharing a single, huge plain object full of global configuration values.

#### Examples

```js
import { configureEnvironment } from '@magento/pwa-buildpack';

// Give `configureEnvironment` the path to the project root. If the current file
// is in project root, you can use the Node builtin `__dirname`.
const configuration = configureEnvironment('/Users/me/path/to/project');

// `configureEnvironment` has now read the contents of
// `/Users/me/path/to/project/.env` and merged it with any environment
// variables that were alredy set.

// Create an UPWARD server using env vars that begin with `UPWARD_JS_`
createUpwardServer(configuration.section('upwardJs'));

// If these environment variables are set:
//
// UPWARD_JS_HOST=https://local.upward/
// UPWARD_JS_PORT=8081
//
// then `configuration.section('upwardJs')` produces this object:
//
// {
//   host: 'https://local.upward',
//   port: '8081'
// }
//
// No other environment variables are included in this object unless they begin
// with `UPWARD_JS_` which is the equivalent of `upwardJs` camel-cased.


// The .all() method turns the whole environment into an object, with all
// CONSTANT_CASE names turned into camelCase names.
const allConfig = configuration.all();

// This object will have one property for each set environment variable,
// including the UPWARD variables named above. But `configuration.all()` does
// not namespace them, they have longer names:
//
// {
//   upwardJsHost: 'https://local.upward',
//   upwardJsPort: '8081'
// }
//
// This huge object defeats the purpose of configureEnvironment() and should
// only be used for debugging.

// Instead, let's create an UPWARD server combining two environment variable
// sections with hardcoded overrides to some values.
createUpwardServer({
  ...configuration.section('upwardJs'),
  ...configuration.section('magento'),
  bindLocal: true
});

// This uses JavaScript object spreading to combine several sections of
// configuration and override a value. If the environment contains these values:
//
// UPWARD_JS_HOST=https://local.pwadev
// UPWARD_JS_PORT=443
// UPWARD_JS_BIND_LOCAL=
// MAGENTO_BACKEND_URL=https://local.magento
//
// Then the above code passes the following object to `createUpwardServer`:
//
// {
//   host: 'https://local.pwadev',
//   port: '443',
//   backendUrl: 'https://local.magento',
//   bindLocal: true
// }


// The `sections()` method can split an env object into named subsections:
createUpwardServer(configuration.sections('upwardJs', 'magento'));

// Given the same environment variables as above, this code will pass the
// following to `createUpwardServer`:
//
// {
//   upwardJs: {
//     host: 'https://local.pwadev',
//     port: '443',
//     bindLocal: '' // the null string is used as a falsy value
//   },
//   magento: {
//     backendUrl: 'https://local.magento'
//   }
// }
//
// (The above is not the actual config object format for `createUpwardServer`,
// but if it was, that's how you'd make it.)

// Use the convenience properties `isProd` and `isDev` instead of testing
// `process.env.NODE_ENV` directly:
if (configuration.isDev) {
  console.log('Development mode');
}
```

## Concepts

One principle of PWA Studio is that _all configuration that **can** be environment variables, **should** be environment variables. Environment variables are portable, cross-platform, and reasonably secure. They can be individually overridden, so they give the user a great deal of control over a complex system.

Many tools use environment variables strictly as edge-case overrides, and store their canonical configuration in other formats. Environment variables have severe limitations; under the strict POSIX definition, an environment variable name is case insensitive, and its value can only be a string. They can't be nested or schematized, and they have no data structures built in. They all belong to a single namespace, and every running process has access to all of them.

These drawbacks are serious enough that much software uses alternate formats, including:

- XML
- JSON
- YAML
- INI / TOML
- .properties files in Java
- .plist files in MacOS
- PHP associative arrays
- Apache directives

All of these formats have advantages over environment variables. Mainly, they tend to have:

1. A standard human-readable file format
2. Nesting and/or namespacing to organize values
3. Data types and metadata

Still, none of these formats have _won_ and become an undisputed replacement for environment variables. Each has quirks and undefined behaviors. None of them are deeply integrated with OS, shell, and container environments. They typically don't work consistently across language runtimes.

PWA Studio chooses to use environment variables, and add simple tools for file format, namespacing, and validation. A centralized configurator "hands off" formatted pieces of the environment to specific tools as parameters. Those tools need have no knowledge of the configuration scheme. Entry point scripts, such as `server.js` and `webpack.config.js`, can use `configureEnvironment` to deserialize environment variables into any kind of data structure, while storing persistent values in an `.env` file in the project root directory.

`Buildpack.configureEnvironment()` combines features of several tools:

- [dotenv][dotenv] for managing environment variables with `.env` files
- [envalid](https://npmjs.com/package/envalid) for describing, validating, and making defaults for settings
- [camelspace](https://npmjs.com/package/camelspace) for easily translating configuration between flat environment variables and namespaced objects

## Best practices

To have environment-variable-based configuration management and enjoy the benefits of file format, namespacing, and validation at the same time, it's important to use `configureEnvironment()` in a certain way.

### Interface

The purpose of a tool like `configureEnvironment` is to keep configuration organized without tightly coupling a system to a manager object. To achieve this, it's important to use `configureEnvironment` and the `Configuration` object it produces at the "top level" or entry point of a program.

It can be tempting to pass a `Configuration` object through to other tools, so they can call `.section()` and `.sections()` by themselves, and define their own namespace prefixes. Resist that temptation! The individual tools should be usable without Buildpack `configureEnvironment`. It is always the responsibility of an "outer" function to pass plain configuration to an "inner" dependency. Use `Configuration` only when moving from one layer of logic to the next.

### Naming convention

POSIX standard environment variables may not be case sensitive and may not allow very many special characters. The best policy is to use `ALL_CAPS_UNDERSCORE_DELIMITED_ALPHANUMERIC_VARIABLE_NAMES` when defining environment variables directly. **Buildpack will ignore any environment variables which do not follow this convention.**

Buildpack converts between this strict all-caps format (also known as **SCREAMING_SNAKE_CASE**) and a more convenient JavaScript object which can be nested at any level of delimiter. When defining new environment variables, consider making their names long and safely namespacing them with prefixes as long as necessary. Then, use the `configuration.section()` and `configuration.sections()` methods to create targeted, small objects whose names aren't as long for use in JavaScript.

### Fallback

By default, Buildpack respects three levels of "fallback":

1. Currently declared environment variables (populated since process startup)
2. Values from the `.env` file in project root
3. Defaults from the metadata in `packages/pwa-buildpack/envVarDefinitions.json`

Additional layers of configuration and on-disk fallback are discouraged. Inside scripts, environment variables may be combined and merged, but too much fall-through of project configuration can result in unpredictable and hard-to-maintain runtime configuration.

[dotenv]: <https://www.npmjs.com/package/dotenv>
