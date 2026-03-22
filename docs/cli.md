# CLI Usage

The calculator now has an agent-friendly CLI entrypoint.

## V2 input

```bash
node ./src/cli/means-test.ts --input examples/input.v2.json --pretty
```

## Legacy input

```bash
node ./src/cli/means-test.ts --legacy --input examples/input.legacy.json --pretty
```

## Piped input

```bash
cat examples/input.v2.json | node ./src/cli/means-test.ts --pretty
```

## Output

The CLI emits JSON only.
- success -> result JSON to stdout
- error -> error JSON to stderr with non-zero exit code

This is intended for tool-calling agents and workflow engines.
