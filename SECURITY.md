# Security Policy

## Supported Versions

Security fixes are applied to the latest published `5.x` release line.

| Version | Supported          |
| ------- | ------------------ |
| 5.x     | :white_check_mark: |
| < 5.0   | :x:                |

## Reporting a Vulnerability

Please report suspected security vulnerabilities **privately** — do not open a
public issue for a security report.

- Preferred: open a private advisory via GitHub Security Advisories
  ("Security" tab → "Report a vulnerability") on this repository.
- Alternatively: open a regular issue that describes only that a security
  report exists and requests a private contact channel (do not include exploit
  details in the public issue).

Please include, where possible:

- A description of the vulnerability and its impact.
- Steps to reproduce (a minimal input text/PDF is ideal).
- The affected version and environment (Node.js version, OS).

## Response Expectations

- Acknowledgement of a report within 7 days.
- An initial assessment and remediation plan within 30 days.
- Credit in the changelog for responsibly disclosed issues, unless you prefer
  to remain anonymous.

## Scope Notes

RCTExtractor processes untrusted publication text and PDFs. The engine runs
regular expressions with timeout protection and performs no network calls
during core extraction. Reports about ReDoS (catastrophic backtracking),
denial-of-service via crafted input, or unsafe file handling in the PDF path
are in scope and welcomed.
