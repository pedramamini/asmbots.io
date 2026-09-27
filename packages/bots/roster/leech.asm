; Leech scans down the core 640 bytes at a time: 32 or's, 20 bytes apart, fold a block into ax,
; and a block that is not all zero gets a repe scasw to find the top word of what it hit.
; Then it bites: 64 fangs over the 256 bytes from 16 bytes above the hit down, each one
; jmp word [through], the word in Leech that holds the address of the pit.
; Every fang is the same two words, FF 26 and the address of through, so the unrolled bite
; writes a fang in two turns and has no sums to do.
; A process that runs a fang lands in the pit, which spl's it into every free slot of its bot and
; loops forever zeroing the 64 bytes that its bx points to, the home of a house-style bot.
; At the end of a scan lap Leech zeros the pit's loop: a held process dies on its next pass, and
; from then on a fang kills at once.
; The unrolled scan and bite are what make it a middleweight: they are 524 of its 599 bytes, the
; scan runs on every block, and the bite on every hit.
; vs imp.asm, seeds 1..20: 19 W / 1 T / 0 L
; vs dwarf.asm, seeds 1..20: 20 W / 0 T / 0 L

%name     "Leech"
%author   "ASM Bots"
%strategy "Bite wide with jmp fangs, hold the bitten in a pit"

K       equ     20                      ; bytes between the words a scan block reads
ORS     equ     32                      ; words a scan block reads
BLOCK   equ     K * ORS                 ; bytes a scan block covers
FANGS   equ     64                      ; fangs in a bite
GAP     equ     4                       ; bytes from one fang to the next
TOP     equ     16                      ; the top fang is this far above the hit
SPREAD  equ     FANGS * GAP             ; bytes a bite covers
JMPW    equ     0x26FF                  ; FF 26: jmp word [disp16], the first word of a fang
SPAN    equ     64                      ; bytes of home a held process zeros
BELOW   equ     TOP + 4                 ; the scan starts this far under the body
ABOVE   equ     SPREAD - TOP            ; do not bite this close above the body
SIZE    equ     end - start

; Setup: the base idiom puts our base address in bx, and bp points at the word the fangs jump through.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        lea     bp, [bx+through]
        lea     ax, [bx+pit]
        mov     [bp+0], ax              ; the fangs jump to the pit
        std                             ; scasw steps down
        lea     di, [bx-BELOW]

; Scan: fold 32 words, K bytes apart, into ax; all zero, and the next block.
scan:   mov     ax, [di]
        or      ax, [di-20]
        or      ax, [di-40]
        or      ax, [di-60]
        or      ax, [di-80]
        or      ax, [di-100]
        or      ax, [di-120]
        or      ax, [di-140]
        or      ax, [di-160]
        or      ax, [di-180]
        or      ax, [di-200]
        or      ax, [di-220]
        or      ax, [di-240]
        or      ax, [di-260]
        or      ax, [di-280]
        or      ax, [di-300]
        or      ax, [di-320]
        or      ax, [di-340]
        or      ax, [di-360]
        or      ax, [di-380]
        or      ax, [di-400]
        or      ax, [di-420]
        or      ax, [di-440]
        or      ax, [di-460]
        or      ax, [di-480]
        or      ax, [di-500]
        or      ax, [di-520]
        or      ax, [di-540]
        or      ax, [di-560]
        or      ax, [di-580]
        or      ax, [di-600]
        or      ax, [di-620]
        jnz     find
        sub     di, BLOCK
        jmp     scan

; Find: the top word that is not zero; our body ends the lap, else a bite.
find:   xor     ax, ax
        mov     cx, BLOCK / 2
        repe    scasw                   ; stops with di two bytes under the hit
        jne     .hit
        jmp     scan                    ; the block went back to zero
.hit:   lea     dx, [di+BELOW+2]
        sub     dx, bx                  ; dx = hit - (base - BELOW)
        cmp     dx, BELOW + SIZE + ABOVE
        jae     bite
        lea     di, [bx-BELOW]          ; our body: the lap is over
        mov     word [bx+pit.hold], 0   ; and so is the pit: its loop is DAT from now on
        jmp     scan

; Bite: 64 fangs from TOP bytes above the hit down, each jmp word [through].
bite:   add     di, TOP + 2 - SPREAD / 2
        mov     ax, JMPW
        mov     [di+124], ax
        mov     [di+126], bp
        mov     [di+120], ax
        mov     [di+122], bp
        mov     [di+116], ax
        mov     [di+118], bp
        mov     [di+112], ax
        mov     [di+114], bp
        mov     [di+108], ax
        mov     [di+110], bp
        mov     [di+104], ax
        mov     [di+106], bp
        mov     [di+100], ax
        mov     [di+102], bp
        mov     [di+96], ax
        mov     [di+98], bp
        mov     [di+92], ax
        mov     [di+94], bp
        mov     [di+88], ax
        mov     [di+90], bp
        mov     [di+84], ax
        mov     [di+86], bp
        mov     [di+80], ax
        mov     [di+82], bp
        mov     [di+76], ax
        mov     [di+78], bp
        mov     [di+72], ax
        mov     [di+74], bp
        mov     [di+68], ax
        mov     [di+70], bp
        mov     [di+64], ax
        mov     [di+66], bp
        mov     [di+60], ax
        mov     [di+62], bp
        mov     [di+56], ax
        mov     [di+58], bp
        mov     [di+52], ax
        mov     [di+54], bp
        mov     [di+48], ax
        mov     [di+50], bp
        mov     [di+44], ax
        mov     [di+46], bp
        mov     [di+40], ax
        mov     [di+42], bp
        mov     [di+36], ax
        mov     [di+38], bp
        mov     [di+32], ax
        mov     [di+34], bp
        mov     [di+28], ax
        mov     [di+30], bp
        mov     [di+24], ax
        mov     [di+26], bp
        mov     [di+20], ax
        mov     [di+22], bp
        mov     [di+16], ax
        mov     [di+18], bp
        mov     [di+12], ax
        mov     [di+14], bp
        mov     [di+8], ax
        mov     [di+10], bp
        mov     [di+4], ax
        mov     [di+6], bp
        mov     [di+0], ax
        mov     [di+2], bp
        mov     [di-4], ax
        mov     [di-2], bp
        mov     [di-8], ax
        mov     [di-6], bp
        mov     [di-12], ax
        mov     [di-10], bp
        mov     [di-16], ax
        mov     [di-14], bp
        mov     [di-20], ax
        mov     [di-18], bp
        mov     [di-24], ax
        mov     [di-22], bp
        mov     [di-28], ax
        mov     [di-26], bp
        mov     [di-32], ax
        mov     [di-30], bp
        mov     [di-36], ax
        mov     [di-34], bp
        mov     [di-40], ax
        mov     [di-38], bp
        mov     [di-44], ax
        mov     [di-42], bp
        mov     [di-48], ax
        mov     [di-46], bp
        mov     [di-52], ax
        mov     [di-50], bp
        mov     [di-56], ax
        mov     [di-54], bp
        mov     [di-60], ax
        mov     [di-58], bp
        mov     [di-64], ax
        mov     [di-62], bp
        mov     [di-68], ax
        mov     [di-66], bp
        mov     [di-72], ax
        mov     [di-70], bp
        mov     [di-76], ax
        mov     [di-74], bp
        mov     [di-80], ax
        mov     [di-78], bp
        mov     [di-84], ax
        mov     [di-82], bp
        mov     [di-88], ax
        mov     [di-86], bp
        mov     [di-92], ax
        mov     [di-90], bp
        mov     [di-96], ax
        mov     [di-94], bp
        mov     [di-100], ax
        mov     [di-98], bp
        mov     [di-104], ax
        mov     [di-102], bp
        mov     [di-108], ax
        mov     [di-106], bp
        mov     [di-112], ax
        mov     [di-110], bp
        mov     [di-116], ax
        mov     [di-114], bp
        mov     [di-120], ax
        mov     [di-118], bp
        mov     [di-124], ax
        mov     [di-122], bp
        mov     [di-128], ax
        mov     [di-126], bp
        sub     di, SPREAD / 2 + 2      ; scan on from under the bite
        jmp     scan

; Pit: a bitten process runs this with its own registers, and writes only zeros, over its home.
pit:    xor     si, si
.hold:  spl     .hold                   ; take every free slot of the bitten bot
        mov     word [bx+si], 0
        add     si, 2
        and     si, SPAN - 1
        jmp     .hold

; Data: the address of the pit, which every fang jumps through.
through: dw     0

end:
