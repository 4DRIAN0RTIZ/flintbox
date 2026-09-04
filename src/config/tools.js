/**
 * tools.js — static configuration: tool definitions, help sources,
 * and application constants. Ported verbatim from the vanilla
 * `public/js/config.js`.
 */

/** Per-tool UI metadata and default examples. */
export const TOOLS = {
  jq: {
    label: 'filter',
    params: '.[] | .name',
    input: '[{"name":"Alice","age":30},{"name":"Bob","age":25}]',
  },
  grep: {
    label: 'pattern',
    params: '-i root',
    input: 'admin:x:1000:1000::/home/admin:/bin/bash\nroot:x:0:0:root:/root:/bin/sh\nguest:x:1001:1001::/home/guest:/bin/sh',
  },
  sed: {
    label: 'expression',
    params: 's/error/WARN/g',
    input: '2024-01-01 error: db timeout\n2024-01-02 error: conn refused\n2024-01-03 info: ok',
  },
  awk: {
    label: 'program',
    params: "'{print $1, $3}'",
    input: 'PID  USER    CMD\n  1  root    init\n 22  root    sshd\n123  alice   bash',
  },
  cut: {
    label: 'options',
    params: '-d, -f1,3',
    input: 'apple,red,10\nbanana,yellow,5\nkiwi,green,8',
  },
};

/**
 * Help sources per tool. Each source is tried in order until one succeeds.
 *
 * Source types:
 *  - { type: 'binary' }           -> calls /api/help/:tool (runs tool --help in container)
 *  - { type: 'http', url }        -> plain-text fetch from a URL
 *  - { type: 'structured', data } -> local JSON structure rendered client-side
 */
export const HELP_SOURCES = {
  jq: [
    { type: 'binary' },
    {
      type: 'structured',
      data: {
        version: 'jq 1.8 (Alpine)',
        synopsis: 'jq [options] <filter> [file...]',
        sections: [
          {
            title: 'Common flags',
            entries: [
              { flag: '-r', desc: 'Output raw strings, not JSON texts' },
              { flag: '-c', desc: 'Compact output (no pretty-print)' },
              { flag: '-n', desc: 'Use `null` as input (ignore stdin)' },
              { flag: '-e', desc: 'Set exit code based on output' },
              { flag: '--arg k v', desc: 'Bind shell variable as $k' },
              { flag: '--argjson k v', desc: 'Bind JSON value as $k' },
            ],
          },
          {
            title: 'Filter cheat-sheet',
            examples: [
              '.foo              # field access',
              '.foo.bar          # nested',
              '.[]              # iterate array',
              '.[] | .name      # map field',
              'select(.age>18)  # filter',
              'map(.+1)         # transform array',
              'keys, values     # object keys/values',
              'length           # string/array/object length',
              'type             # "string","number","array"…',
              'to_entries       # [{key,value}]',
              '@base64          # encode',
              '@csv, @tsv       # format',
            ],
          },
        ],
      },
    },
  ],

  grep: [
    { type: 'binary' },
    {
      type: 'structured',
      data: {
        version: 'GNU grep 3.12 (Alpine)',
        synopsis: 'grep [options] PATTERN [FILE...]',
        sections: [
          {
            title: 'Common flags',
            entries: [
              { flag: '-i', desc: 'Ignore case' },
              { flag: '-v', desc: 'Invert match (non-matching lines)' },
              { flag: '-n', desc: 'Print line numbers' },
              { flag: '-c', desc: 'Count matching lines' },
              { flag: '-l', desc: 'Print only file names with matches' },
              { flag: '-E', desc: 'Extended regex (same as egrep)' },
              { flag: '-P', desc: 'Perl-compatible regex' },
              { flag: '-o', desc: 'Print only the matched part' },
              { flag: '-A N', desc: 'N lines of trailing context' },
              { flag: '-B N', desc: 'N lines of leading context' },
              { flag: '-C N', desc: 'N lines of surrounding context' },
              { flag: '-r', desc: 'Recursive search' },
            ],
          },
        ],
      },
    },
  ],

  sed: [
    { type: 'binary' },
    {
      type: 'structured',
      data: {
        version: 'GNU sed 4.9 (Alpine)',
        synopsis: 'sed [options] script [file...]',
        sections: [
          {
            title: 'Common flags',
            entries: [
              { flag: '-n', desc: 'Suppress default output' },
              { flag: '-e script', desc: 'Add script to execute' },
              { flag: '-i[SUFFIX]', desc: 'Edit file in-place (+ optional backup)' },
              { flag: '-r / -E', desc: 'Extended regex' },
            ],
          },
          {
            title: 'Command cheat-sheet',
            examples: [
              's/old/new/        # substitute first match per line',
              's/old/new/g       # substitute all matches',
              's/old/new/gi      # case-insensitive global',
              '/pattern/d        # delete matching lines',
              '/pattern/p        # print matching lines (-n)',
              '2,5d              # delete lines 2–5',
              '=                 # print line number',
              'y/abc/ABC/        # transliterate chars',
            ],
          },
        ],
      },
    },
  ],

  awk: [
    { type: 'binary' },
    {
      type: 'structured',
      data: {
        version: 'GNU awk 5.3 (Alpine)',
        synopsis: "awk [options] 'program' [file...]",
        sections: [
          {
            title: 'Common flags',
            entries: [
              { flag: '-F sep', desc: 'Set field separator' },
              { flag: '-v k=v', desc: 'Assign variable before execution' },
              { flag: '-f file', desc: 'Read program from file' },
            ],
          },
          {
            title: 'Program cheat-sheet',
            examples: [
              '{print $1}            # first field',
              '{print $NF}           # last field',
              '{print NR, $0}        # line number + line',
              'NR==2{print}          # print line 2',
              '/pattern/{print $2}   # conditional',
              'BEGIN{OFS=","}{print $1,$2}  # custom output sep',
              'END{print NR}         # total line count',
              '{sum+=$1} END{print sum}     # sum a column',
            ],
          },
        ],
      },
    },
  ],

  cut: [
    { type: 'binary' },
    {
      type: 'structured',
      data: {
        version: 'GNU cut (coreutils 9.8, Alpine)',
        synopsis: 'cut OPTION... [FILE...]',
        sections: [
          {
            title: 'Common flags',
            entries: [
              { flag: '-d DELIM', desc: 'Use DELIM instead of TAB' },
              { flag: '-f LIST', desc: 'Select fields (1-based, comma or range)' },
              { flag: '-c LIST', desc: 'Select characters' },
              { flag: '-b LIST', desc: 'Select bytes' },
              { flag: '--complement', desc: 'Complement the selection' },
            ],
          },
          {
            title: 'Examples',
            examples: [
              '-d, -f1          # first CSV field',
              '-d: -f1,3        # fields 1 and 3, colon delim',
              '-d, -f2-         # field 2 to end',
              '-c1-10           # first 10 characters',
            ],
          },
        ],
      },
    },
  ],
};

export const HIST_KEY = 'flintbox-v2-history';
export const HIST_MAX = 10;
