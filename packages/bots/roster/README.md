# Roster

The bots that ship with ASM Bots. Each bot is one x16c file in this folder (a test bot is in `test/`) and one row in `src/roster.ts`. `test/roster.test.ts` holds every file to the [house style](#house-style).

## Families

Six families come from classic Core War. The bots translate the ideas, not the Redcode: a Redcode `DAT` is a `00` byte here, `SPL` is `spl`, and the core is 64 KB of bytes that start at zero, so a process that runs into empty core dies.

| Family | Core War ancestor | The idea in x16c |
|---|---|---|
| `imp` | Imp (A. K. Dewdney, 1984), imp rings | A self-copier: `movsw` copies the running word one step ahead and the process runs into the copy. It is hard to kill and seldom kills, so imps seldom win. |
| `dwarf` | Dwarf (A. K. Dewdney, 1984) | A bomber: it writes DAT (`mov word [di], 0`) at a fixed stride as it walks the core. Each lap ends just past the bot, so the bombs never land on it. Gate adds an imp gate, and Decoy hides in noise first. |
| `stone` | Stones | A dwarf that uses `spl` to run several bombers with different strides, often with an imp as a decoy. |
| `paper` | Paper, Silk | A replicator: `rep movsw` copies the bot, `spl` starts the copy, and each copy copies again. Bombs cannot kill the copies as fast as they appear. Silk starts each copy on a `jmp $` pad before it writes it. |
| `scanner` | Scanners | It looks for non-zero bytes with `repe scasb` (which repeats while the byte is zero) and carpet-bombs what it finds with `rep stosw`, skipping its own body. Hybrid turns to paper when bombs land near its home. |
| `vampire` | Vampires | It writes `jmp` fangs over enemy code. A process that runs a fang jumps into a pit, where it zeros its own home and takes its bot's free slots, until the vampire closes the pit and it dies. |
| `painter` | None: ASM Bots only | Showcase bots that paint patterns over the core and make the arena worth watching. LCG Painter (after RandomWriter1 of v1) scatters `0xAA` in clouds that drift and jump, and Spiral Painter paints `0x55` along a square spiral around itself. They are the demo pair of the home page, and they fight: in most seeds the paint of one breaks the code of the other before the cycle cap. |
| `test` | None | Small bots that each pin down one engine behavior: `halt` (dies at once), `spin` (lives to the cycle cap), `count` (one instruction a cycle), `spl-storm` (the process cap), `stack-walk` (the stack grows down from the base), `rep-copy` (one `rep` iteration a cycle), `div-zero` (a divide by zero kills), and `misalign` (decode follows ip into the middle of an instruction). They are not fighters. |

In x16c the classic families do not form the Redcode triangle. Over seeds 1..200, a stone beats a scanner in 80% of the rounds (the scanner is big and slow), but paper beats a stone (62%, and loses 2%), a scanner (86%), and a dwarf (76%), and loses almost never: every copy writes paper over whatever it lands on, faster than bombs or a scan can find 64 processes in 64 places. The vampire beats bombers and scanners in three rounds of four or more and takes 38% of its rounds from paper, whose copies land on it in most of the others. Imps lose to most fighters, and an imp gate kills them.

## Tiers

| Tier | Holds |
|---|---|
| `showcase` | The headline fighters and painters. The golden matchups play them against each other. |
| `solid` | Real fighters that fill out the roster. The golden melees play them. |
| `test` | The test bots: family `test`, file `roster/test/<slug>.asm`. Every other bot is `roster/<slug>.asm`. |

## Weight classes

A hill can take bots of one size class (`packages/protocol/src/weight.ts`), and the roster carries ten or more fighters in each: `test/roster.test.ts` checks it. The first 14 fighters and painters are lightweights. The 30 heavier ones, lightest class first:

| Bot | Bytes | Class | Tactic |
|---|---|---|---|
| `bastion` | 548 | middleweight | A dwarf with 128 unrolled bombs a pass, between two fields of fake code |
| `twins` | 524 | middleweight | Paper whose copies alternate a dense and a wide unrolled burst |
| `legion` | 587 | middleweight | 12 imps and 48 lane bombers that turn gate when an imp comes |
| `mortar` | 859 | middleweight | Lays spl traps for a lap, then DAT over them |
| `sentinel` | 577 | middleweight | A 126-bomb unrolled bomber that starts an imp gate when a wire trips |
| `quarry` | 723 | middleweight | Four unrolled bombers, four strides, one process each |
| `origami` | 678 | middleweight | Paper in two folds that mends the live fold from the spare |
| `sweeper` | 625 | middleweight | Scans with an unrolled fold, carpets each hit and sweeps 1.5 KB under it |
| `harrier` | 603 | middleweight | Scans and carpets; bombs blind when a lap is crowded or empty |
| `leech` | 599 | middleweight | Bites wide with 64 identical jmp fangs, holds the bitten in a pit |
| `hydra` | 1,288 | heavyweight | Scans a lap, bombs four laps, then walks as an imp ring |
| `mender` | 1,443 | heavyweight | A bomber that mends its loop from a spare copy |
| `wraith` | 1,226 | heavyweight | Bombs one lap, then walks off as a large imp that bombs two lines |
| `juggernaut` | 1,064 | heavyweight | Two bomb fronts, one up and one down, 256 bombs a pass |
| `garrison` | 1,140 | heavyweight | An upward bomber and an imp gate, mended by a vote of three copies |
| `colossus` | 1,196 | heavyweight | Six unrolled bombers with prime strides, four up and two down |
| `phalanx` | 1,322 | heavyweight | Eight bombers side by side that bomb out from the body both ways |
| `labyrinth` | 1,056 | heavyweight | Paper whose big copies each bomb a 16 KB field |
| `kraken` | 1,218 | heavyweight | Three scanner arms in parallel, each striking what it finds |
| `basilisk` | 1,116 | heavyweight | A vampire whose bite is a 928-byte fang table; the pit sets the bitten on their own bot |
| `citadel` | 2,138 | super-heavy | Three bomber cells, each rebuilding the next when it dies |
| `swarm` | 2,334 | super-heavy | 64 bombers side by side, one process and one lane each |
| `titan` | 3,381 | super-heavy | A 400-bomb loop that moves between two homes and rewrites the other one |
| `dreadnought` | 2,872 | super-heavy | Three unrolled bomb loops that mend from a spare copy |
| `monolith` | 2,411 | super-heavy | Eight bombers in eight cells, four up and four down, strides 6 to 116 |
| `fortress` | 2,137 | super-heavy | Three bombers between two imp gates; a tripwire floods the low one |
| `behemoth` | 2,088 | super-heavy | Paper that drops 520 bombs on each landing place, then copies itself there |
| `hive` | 2,179 | super-heavy | 24 small papers side by side, each with a step of its own |
| `leviathan` | 2,298 | super-heavy | Four scanner cells, two up and two down, each folding 1,536 bytes with 128 or's |
| `overlord` | 2,265 | super-heavy | Bites 1 KB with fangs, zeros 2 KB from the pit, gates imps |

## House style

A roster bot reads like this one:

```nasm
; Sketch drops one lap of DAT bombs, 8 bytes apart, starting just past its own end.
; The lap stops 256 bytes short of home and the bot then spins in place, so it never bombs itself.
; It shows the house style and is not a roster bot.

%name     "Sketch"
%author   "ASM Bots"
%strategy "One lap of DAT bombs, 8 bytes apart, then spin"

STRIDE  equ     8                       ; bytes between bombs
LAP     equ     0xFF00 / STRIDE         ; bombs in a lap that stops 256 bytes short

; Setup: the base idiom puts our base address in bx.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        lea     di, [bx+end]
        mov     cx, [bx+count]          ; own data, read through bx

; Bomb: one DAT per turn until the lap is done, then spin.
bomb:   add     di, STRIDE
        mov     word [di], 0
        loop    bomb
        jmp     $

; Data, after the code, where no instruction falls into it.
count:  dw      LAP
end:
```

1. **Header comment.** The file starts with `;` lines: three sentences on the tactic, which say what the bot does, how, and why that works. A fighter adds the records from its acceptance tests, one line for each rival, in this form: `; vs imp.asm, seeds 1..20: 14 W / 6 T / 0 L`.
2. **Metadata.** `%name`, `%author`, and `%strategy`, in that order, after one blank line. `%name` and `%author` are the `name` and `author` of the roster entry. `%strategy` is one short line for the arena.
3. **Constants.** Each tuning number (a stride, an offset, a count) is an `equ` in capitals before `start:`, with a comment.
4. **The base idiom.** The loader puts a bot at a random address and does not relocate it (ISA §6.4). So `start:` begins with `call .here`, `pop bx`, and `sub bx, .here`, and then `bx` holds the base address. The bot gets to its own data only through `[bx+label]`: `[label]` is a fixed address in the core, and the linter warns on it. `jmp`, `call`, `loop`, and `spl` are relative and need no base. A bot that needs `bx` for other work keeps the base in another register, and a comment says which.
5. **Labeled sections.** One global label per phase (`start` for setup, then `bomb`, `scan`, `copy`, and so on), with a comment line above it, and `.local` labels inside a phase. Data and bomb templates go after the code, behind a jump, where no instruction falls into them.
6. **Formatter-clean.** The file is exactly what `formatSource` gives for it: labels in column 0, mnemonics in 8, operands in 16, and comments in 40.
7. **Lint-clean.** `lint` gives no warnings, except on a line with an allow comment, `; lint: allow <code>: <reason>`. The comment names the code of a warning on its own line and says why the bot needs it. An allow comment that allows no warning fails the test. From `test/halt.asm`:

   ```text
   start:  hlt                             ; lint: allow hlt-in-code: dying at once is the whole bot
   ```

8. **Sized for its class.** 1 to 4,096 bytes (`MAX_BOT_BYTES`), and a bot over 512 bytes spends its size on work: two thirds or more of its bytes are code that runs or data it reads, and its header says why it is the size it is. See [Weight classes](#weight-classes).

`test/roster.test.ts` checks each rule that a machine can check: the header comment of three or more sentences, the metadata against the entry, the formatter, the linter, the size, and zero assembler errors. It checks the Sketch bot above the same way. `test/fighters.test.ts` fights each bot with the helper in `test/fight.ts` (hill rules, 80,000 cycles, the bot order swapped every other seed) and checks that each record line in a header is the record it gets. `test/painters.test.ts` and `test/test-bots.test.ts` check what each painter and each test bot does, and `test/goldens.test.ts` checks the [goldens](../README.md#goldens).

## Loading

`src/roster.ts` imports each file as text (`import imp from '../roster/imp.asm' with { type: 'text' }`), so the bots are in the bundle and the package runs in browsers and Workers, with no file system. Bun reads these imports as they are; the web and Worker builds need a text loader for `.asm` files. A new bot is a file here, an import, and a row in `ROWS`, then tests and goldens: [Adding a bot](../README.md#adding-a-bot) gives each step.
