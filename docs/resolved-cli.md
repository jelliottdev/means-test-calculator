# Resolved Dataset CLI

This CLI runs the means test using the file-backed dataset resolver.

## Example

```bash
node ./src/cli/means-test-resolved.ts --data-dir data/means-test --input examples/input.v2.json --pretty
```

## Legacy input

```bash
node ./src/cli/means-test-resolved.ts --legacy --data-dir data/means-test --input examples/input.legacy.json --pretty
```

## Behavior

- Reads input JSON from `--input` or stdin
- Resolves datasets from `--data-dir`
- Emits JSON result to stdout
- Emits JSON error to stderr on failure

## Important

The current repository includes only a sample manifest. The official data ingestion pipeline still needs to emit full artifact files for real resolved execution.
