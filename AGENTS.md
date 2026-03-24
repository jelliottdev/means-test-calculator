# Codex notes for means-test-calculator

- B122A-2 export must use strict AcroForm field filling only.
- Never add coordinate-based fallback rendering.
- Leave all signature/date signature fields blank for manual signing.
- Fail closed on field mismatches: missing required fields must throw and abort export.
- Keep exporter architecture separated:
  1. calculator result -> projection values
  2. projection values -> PDF field map
  3. PDF fill utility
