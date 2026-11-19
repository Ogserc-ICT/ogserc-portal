# Common passwords list: source

The staff password policy (Step 3 plan commit 3, NFR-SEC-01) refuses any password in this list.

## What is redistributed

One file, unmodified: `10k-most-common.txt`.

| | |
|---|---|
| Project | SecLists, https://github.com/danielmiessler/SecLists |
| Path in SecLists | `Passwords/Common-Credentials/10k-most-common.txt` |
| Commit | `10a38f6cbe8ed6b89d55348756eff7486cd0f0ea` (master on 2026-10-21) |
| Downloaded from | `https://raw.githubusercontent.com/danielmiessler/SecLists/10a38f6cbe8ed6b89d55348756eff7486cd0f0ea/Passwords/Common-Credentials/10k-most-common.txt` |
| SHA-256 | `68782d6a4a19a4768d5f15dd66bd534e7a33055cc755411e33f16d18c50fdcce` |
| Size | 73,026 bytes, 10,001 lines (LF), 10,001 distinct entries, also when compared without case |
| Licence | MIT, `LICENSE` in this folder: SecLists' licence file at the same commit, verbatim (SHA-256 `3dbdc93d5f8829de0941744841730a09c106d0732e5ae0e98ca1d77be7ded66c`) |

Nothing else from SecLists is included. `.gitattributes` keeps both files byte for byte (no line-ending
conversion, for example by `core.autocrlf` on a Windows checkout), and `tests/unit/common-passwords.spec.ts` checks both hashes. `LICENSE` ships with the list in the
production build, because the build redistributes the list.

## How much it adds

Only 10 of the 10,001 entries are 12 characters or longer (the longest is 18). The policy's 12-character minimum
already refuses every other entry, so beyond the length rule this list refuses 10 passwords. It is kept as a small
offline floor that works without the network, and in case the minimum is ever lowered. The breach check
(Have I Been Pwned range API) does the real work. See docs/DECISIONS.md D-053.

## Updating

Pick a new commit, download both files from `raw.githubusercontent.com` at that commit only, and update the table,
the hashes in the unit test, and D-053.
