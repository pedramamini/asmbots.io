; Basilisk is a vampire whose bite is a table of 232 fangs, 928 bytes: big enough to cover most of
; a heavyweight rival at once.
; It scans the core down, 16 words 32 bytes apart for each jump, and on a hit it copies the whole
; table with rep movsw over the code from just above the hit.
; Each fang is call word [ptr], and ptr holds the address of the pit, so a fang is the same 4 bytes
; wherever it lands and the table is built once, at setup.
; A process that runs a fang calls the pit, which pops the place of its bite from the stack, spl's
; into every free slot of its bot, and puts each held process to work: it zeros the 256 bytes
; around that place again and again, so the bitten bot takes its own code apart with its own turns.
; At the end of each scan lap the vampire closes the pit with DAT, and the held processes die; the
; next bite opens it again.
; The fang table is what makes it a heavyweight: it is 928 of its 1,116 bytes, and each bite reads
; all of it.
; vs imp.asm, seeds 1..20: 20 W / 0 T / 0 L
; vs dwarf.asm, seeds 1..20: 19 W / 0 T / 1 L

%name     "Basilisk"
%author   "ASM Bots"
%strategy "Bite with a big table of fangs, and set the bitten on their own bot"

FANGS   equ     232                     ; fangs in the table, 4 bytes each
BITE    equ     4 * FANGS               ; bytes in a bite
TOP     equ     16                      ; the bite starts this far above the hit
ZONE    equ     256                     ; bytes around its fang that a held process zeros
K       equ     32                      ; bytes between sampled words
N       equ     16                      ; words the scan folds
BLOCK   equ     N * K                   ; bytes a fold covers
BELOW   equ     TOP + ZONE / 2 + 8      ; the scan starts this far under the body
ABOVE   equ     BITE - TOP + ZONE / 2   ; do not bite this close above the body
OPEN    equ     0xFE60                  ; spl .hold, the first word of the pit loop
SIZE    equ     end - start

; Setup: the base idiom puts our base address in bx.
start:  call    .here
.here:  pop     bx
        sub     bx, .here

; Arm: point ptr at the pit, and each fang of the table at ptr.
arm:    lea     ax, [bx+pit]
        mov     [bx+ptr], ax
        lea     ax, [bx+ptr]
        lea     di, [bx+table+2]
        mov     cx, FANGS
.fang:  mov     [di], ax
        add     di, 4
        loop    .fang
        xor     ax, ax                  ; ax = 0, what repe scasw passes over
        std                             ; the scan goes down
        lea     di, [bx-BELOW]

; Scan: fold N words K bytes apart into dx; all zero, and the next block.
scan:   mov     dx, [di]
        or      dx, [di-32]
        or      dx, [di-64]
        or      dx, [di-96]
        or      dx, [di-128]
        or      dx, [di-160]
        or      dx, [di-192]
        or      dx, [di-224]
        or      dx, [di-256]
        or      dx, [di-288]
        or      dx, [di-320]
        or      dx, [di-352]
        or      dx, [di-384]
        or      dx, [di-416]
        or      dx, [di-448]
        or      dx, [di-480]
        jnz     find
        sub     di, BLOCK
        jmp     scan

; Find: the first word that is not zero, from di down; our body or near it ends the lap.
find:   mov     cx, BLOCK / 2
        repe    scasw                   ; stops with di two bytes under the hit
        jne     .hit
        jmp     scan                    ; the block went back to zero
.hit:   lea     dx, [di+BELOW+2]
        sub     dx, bx                  ; dx = hit - (base - BELOW)
        cmp     dx, BELOW + SIZE + ABOVE
        jae     bite
        add     bp, 2                   ; the next lap samples the next word
        and     bp, K - 1
        lea     di, [bx-BELOW]
        sub     di, bp
        mov     word [bx+pit.hold], 0   ; and the pit closes: its loop is DAT
        jmp     scan

; Bite: copy the whole table over the code from TOP bytes above the hit down.
bite:   add     di, TOP + 2
        mov     word [bx+pit.hold], OPEN ; open the pit again
        lea     si, [bx+table+BITE-2]
        mov     cx, BITE / 2
        rep     movsw
        jmp     scan

; Pit: a fang calls it, so a held process pops the place it was bitten, fills its bot's free
; slots, and zeros the ZONE bytes around that place, over and over.
pit:    pop     bp
        xor     di, di
.hold:  spl     .hold
        mov     word [bp+di-ZONE/2], 0
        add     di, 2
        and     di, ZONE - 1
        jmp     .hold

; Data: ptr holds the address of the pit, and each fang is call word [ptr].
ptr:    dw      0
table:  times   FANGS dw 0x16FF, 0

end:
