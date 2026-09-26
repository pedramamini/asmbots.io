; Hydra has three heads, each a loop of its own, and runs them one after the other.
; Scan: one lap of the core, 512 bytes at a time: 64 or's, 8 bytes apart, fold a block into ax
; in 64 turns, so the scan passes 8 bytes a turn, four times as fast as repe scasw. A block that
; is not all zero gets a repe scasw to find the hit and a carpet of 64 bytes around it. When the
; scan comes round to our own body, the lap is over, and what it did not find, it cannot find.
; Bomb: four laps of 256 DAT words 8 bytes apart, through di, bp, si, and bx for one jump; each lap
; starts 2 bytes lower than the last, so the four laps leave no gap between bombs.
; Walk: last, it writes two imps a third of the core apart and walks as the third, as imp-ring.asm
; does, so that a rival the bombs missed has three imps to kill before it wins.
; The two unrolled loops are what make it a heavyweight: 238 bytes of or's and 893 bytes of bombs
; are 1,131 of its 1,288 bytes, and every one of them runs.
; vs imp.asm, seeds 1..20: 17 W / 3 T / 0 L
; vs dwarf.asm, seeds 1..20: 17 W / 0 T / 3 L

%name     "Hydra"
%author   "ASM Bots"
%strategy "Scan a lap, bomb four laps, then walk as an imp ring"

BLOCK   equ     512                     ; bytes the or's fold into ax
TOP     equ     34                      ; the carpet starts this far above the hit
CWORDS  equ     32                      ; words in a carpet: 64 bytes
BELOW   equ     TOP + 3                 ; a hit this close under the body is our own
ABOVE   equ     2 * CWORDS - 2 - TOP    ; and so is one this close above it
STRIDE  equ     8                       ; bytes between bombs
REACH   equ     32 * STRIDE             ; a pointer bombs from REACH - STRIDE over it to REACH under it
PASS    equ     8 * REACH               ; bytes a pass covers: four pointers, 2 * REACH each
LAP     equ     (0x10000 - SIZE - STRIDE) / PASS ; passes in a lap: the last bomb lands past the body
THIRD   equ     21846                   ; a third of the core, rounded to an even number
PAIR    equ     0x90A5                  ; movsw (A5) then nop (90), as a little-endian word
SIZE    equ     end - start

; Setup: the base idiom puts our base address in bx; the scan steps down from under the body.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        std                             ; scasw and stosw step down
        lea     di, [bx-BELOW-2]

; Scan: fold the block from di down into ax; all zero, and the next block.
scan:   xor     ax, ax
        or      ax, [di]
        or      ax, [di-8]
        or      ax, [di-16]
        or      ax, [di-24]
        or      ax, [di-32]
        or      ax, [di-40]
        or      ax, [di-48]
        or      ax, [di-56]
        or      ax, [di-64]
        or      ax, [di-72]
        or      ax, [di-80]
        or      ax, [di-88]
        or      ax, [di-96]
        or      ax, [di-104]
        or      ax, [di-112]
        or      ax, [di-120]
        or      ax, [di-128]
        or      ax, [di-136]
        or      ax, [di-144]
        or      ax, [di-152]
        or      ax, [di-160]
        or      ax, [di-168]
        or      ax, [di-176]
        or      ax, [di-184]
        or      ax, [di-192]
        or      ax, [di-200]
        or      ax, [di-208]
        or      ax, [di-216]
        or      ax, [di-224]
        or      ax, [di-232]
        or      ax, [di-240]
        or      ax, [di-248]
        or      ax, [di-256]
        or      ax, [di-264]
        or      ax, [di-272]
        or      ax, [di-280]
        or      ax, [di-288]
        or      ax, [di-296]
        or      ax, [di-304]
        or      ax, [di-312]
        or      ax, [di-320]
        or      ax, [di-328]
        or      ax, [di-336]
        or      ax, [di-344]
        or      ax, [di-352]
        or      ax, [di-360]
        or      ax, [di-368]
        or      ax, [di-376]
        or      ax, [di-384]
        or      ax, [di-392]
        or      ax, [di-400]
        or      ax, [di-408]
        or      ax, [di-416]
        or      ax, [di-424]
        or      ax, [di-432]
        or      ax, [di-440]
        or      ax, [di-448]
        or      ax, [di-456]
        or      ax, [di-464]
        or      ax, [di-472]
        or      ax, [di-480]
        or      ax, [di-488]
        or      ax, [di-496]
        or      ax, [di-504]
        jnz     find
        sub     di, BLOCK
        jmp     scan

; Find: the first word that is not zero, from di down; our body ends the lap, else a carpet.
find:   xor     ax, ax                  ; ax = 0 for the scan and for the carpet
        mov     cx, BLOCK / 2
        repe    scasw                   ; stops with di two bytes under the hit
        jne     .hit
        jmp     scan                    ; the block went back to zero
.hit:   lea     dx, [di+BELOW+2]
        sub     dx, bx                  ; dx = hit - (base - BELOW)
        cmp     dx, BELOW + SIZE + ABOVE
        jb      bomber                  ; our own body: the lap is over
        add     di, TOP + 2
        mov     cx, CWORDS
        rep     stosw
        jmp     scan

; Bomber: dx keeps our base, and drift is where this lap starts under it: 0, -2, -4, then -6.
bomber: mov     dx, bx

lap:    mov     bx, dx
        mov     si, [bx+drift]
        cmp     si, -STRIDE
        jne     .go
        jmp     ring                    ; four laps done
.go:    sub     word [bx+drift], 2
        lea     di, [bx+si-REACH]
        lea     bp, [di-2*REACH]
        lea     si, [bp-2*REACH]
        lea     bx, [si-2*REACH]
        mov     cx, LAP
        xor     ax, ax                  ; ax = 0 is the bomb

; Pass: 256 bombs, then one step down and one jump.
pass:
        mov     [di+248], ax
        mov     [di+240], ax
        mov     [di+232], ax
        mov     [di+224], ax
        mov     [di+216], ax
        mov     [di+208], ax
        mov     [di+200], ax
        mov     [di+192], ax
        mov     [di+184], ax
        mov     [di+176], ax
        mov     [di+168], ax
        mov     [di+160], ax
        mov     [di+152], ax
        mov     [di+144], ax
        mov     [di+136], ax
        mov     [di+128], ax
        mov     [di+120], ax
        mov     [di+112], ax
        mov     [di+104], ax
        mov     [di+96], ax
        mov     [di+88], ax
        mov     [di+80], ax
        mov     [di+72], ax
        mov     [di+64], ax
        mov     [di+56], ax
        mov     [di+48], ax
        mov     [di+40], ax
        mov     [di+32], ax
        mov     [di+24], ax
        mov     [di+16], ax
        mov     [di+8], ax
        mov     [di+0], ax
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        mov     [di-72], ax
        mov     [di-80], ax
        mov     [di-88], ax
        mov     [di-96], ax
        mov     [di-104], ax
        mov     [di-112], ax
        mov     [di-120], ax
        mov     [di-128], ax
        mov     [di-136], ax
        mov     [di-144], ax
        mov     [di-152], ax
        mov     [di-160], ax
        mov     [di-168], ax
        mov     [di-176], ax
        mov     [di-184], ax
        mov     [di-192], ax
        mov     [di-200], ax
        mov     [di-208], ax
        mov     [di-216], ax
        mov     [di-224], ax
        mov     [di-232], ax
        mov     [di-240], ax
        mov     [di-248], ax
        mov     [di-256], ax
        mov     [bp+248], ax
        mov     [bp+240], ax
        mov     [bp+232], ax
        mov     [bp+224], ax
        mov     [bp+216], ax
        mov     [bp+208], ax
        mov     [bp+200], ax
        mov     [bp+192], ax
        mov     [bp+184], ax
        mov     [bp+176], ax
        mov     [bp+168], ax
        mov     [bp+160], ax
        mov     [bp+152], ax
        mov     [bp+144], ax
        mov     [bp+136], ax
        mov     [bp+128], ax
        mov     [bp+120], ax
        mov     [bp+112], ax
        mov     [bp+104], ax
        mov     [bp+96], ax
        mov     [bp+88], ax
        mov     [bp+80], ax
        mov     [bp+72], ax
        mov     [bp+64], ax
        mov     [bp+56], ax
        mov     [bp+48], ax
        mov     [bp+40], ax
        mov     [bp+32], ax
        mov     [bp+24], ax
        mov     [bp+16], ax
        mov     [bp+8], ax
        mov     [bp+0], ax
        mov     [bp-8], ax
        mov     [bp-16], ax
        mov     [bp-24], ax
        mov     [bp-32], ax
        mov     [bp-40], ax
        mov     [bp-48], ax
        mov     [bp-56], ax
        mov     [bp-64], ax
        mov     [bp-72], ax
        mov     [bp-80], ax
        mov     [bp-88], ax
        mov     [bp-96], ax
        mov     [bp-104], ax
        mov     [bp-112], ax
        mov     [bp-120], ax
        mov     [bp-128], ax
        mov     [bp-136], ax
        mov     [bp-144], ax
        mov     [bp-152], ax
        mov     [bp-160], ax
        mov     [bp-168], ax
        mov     [bp-176], ax
        mov     [bp-184], ax
        mov     [bp-192], ax
        mov     [bp-200], ax
        mov     [bp-208], ax
        mov     [bp-216], ax
        mov     [bp-224], ax
        mov     [bp-232], ax
        mov     [bp-240], ax
        mov     [bp-248], ax
        mov     [bp-256], ax
        mov     [si+248], ax
        mov     [si+240], ax
        mov     [si+232], ax
        mov     [si+224], ax
        mov     [si+216], ax
        mov     [si+208], ax
        mov     [si+200], ax
        mov     [si+192], ax
        mov     [si+184], ax
        mov     [si+176], ax
        mov     [si+168], ax
        mov     [si+160], ax
        mov     [si+152], ax
        mov     [si+144], ax
        mov     [si+136], ax
        mov     [si+128], ax
        mov     [si+120], ax
        mov     [si+112], ax
        mov     [si+104], ax
        mov     [si+96], ax
        mov     [si+88], ax
        mov     [si+80], ax
        mov     [si+72], ax
        mov     [si+64], ax
        mov     [si+56], ax
        mov     [si+48], ax
        mov     [si+40], ax
        mov     [si+32], ax
        mov     [si+24], ax
        mov     [si+16], ax
        mov     [si+8], ax
        mov     [si+0], ax
        mov     [si-8], ax
        mov     [si-16], ax
        mov     [si-24], ax
        mov     [si-32], ax
        mov     [si-40], ax
        mov     [si-48], ax
        mov     [si-56], ax
        mov     [si-64], ax
        mov     [si-72], ax
        mov     [si-80], ax
        mov     [si-88], ax
        mov     [si-96], ax
        mov     [si-104], ax
        mov     [si-112], ax
        mov     [si-120], ax
        mov     [si-128], ax
        mov     [si-136], ax
        mov     [si-144], ax
        mov     [si-152], ax
        mov     [si-160], ax
        mov     [si-168], ax
        mov     [si-176], ax
        mov     [si-184], ax
        mov     [si-192], ax
        mov     [si-200], ax
        mov     [si-208], ax
        mov     [si-216], ax
        mov     [si-224], ax
        mov     [si-232], ax
        mov     [si-240], ax
        mov     [si-248], ax
        mov     [si-256], ax
        mov     [bx+248], ax
        mov     [bx+240], ax
        mov     [bx+232], ax
        mov     [bx+224], ax
        mov     [bx+216], ax
        mov     [bx+208], ax
        mov     [bx+200], ax
        mov     [bx+192], ax
        mov     [bx+184], ax
        mov     [bx+176], ax
        mov     [bx+168], ax
        mov     [bx+160], ax
        mov     [bx+152], ax
        mov     [bx+144], ax
        mov     [bx+136], ax
        mov     [bx+128], ax
        mov     [bx+120], ax
        mov     [bx+112], ax
        mov     [bx+104], ax
        mov     [bx+96], ax
        mov     [bx+88], ax
        mov     [bx+80], ax
        mov     [bx+72], ax
        mov     [bx+64], ax
        mov     [bx+56], ax
        mov     [bx+48], ax
        mov     [bx+40], ax
        mov     [bx+32], ax
        mov     [bx+24], ax
        mov     [bx+16], ax
        mov     [bx+8], ax
        mov     [bx+0], ax
        mov     [bx-8], ax
        mov     [bx-16], ax
        mov     [bx-24], ax
        mov     [bx-32], ax
        mov     [bx-40], ax
        mov     [bx-48], ax
        mov     [bx-56], ax
        mov     [bx-64], ax
        mov     [bx-72], ax
        mov     [bx-80], ax
        mov     [bx-88], ax
        mov     [bx-96], ax
        mov     [bx-104], ax
        mov     [bx-112], ax
        mov     [bx-120], ax
        mov     [bx-128], ax
        mov     [bx-136], ax
        mov     [bx-144], ax
        mov     [bx-152], ax
        mov     [bx-160], ax
        mov     [bx-168], ax
        mov     [bx-176], ax
        mov     [bx-184], ax
        mov     [bx-192], ax
        mov     [bx-200], ax
        mov     [bx-208], ax
        mov     [bx-216], ax
        mov     [bx-224], ax
        mov     [bx-232], ax
        mov     [bx-240], ax
        mov     [bx-248], ax
        mov     [bx-256], ax
        sub     di, PASS
        sub     bp, PASS
        sub     si, PASS
        sub     bx, PASS
        loop    .next
        jmp     lap
.next:  jmp     pass

; Ring: write an imp a third of the core ahead and two thirds ahead, start each, and walk.
ring:   cld                             ; the imps walk up
        lea     si, [bx+imp]
        mov     cx, 2
.launch: add    si, THIRD
        mov     word [si], PAIR
        lea     di, [si+2]
        spl     si                      ; the child gets these si and di
        loop    .launch
        lea     si, [bx+imp]
        lea     di, [bx+imp+2]

; Walk: the imp step, as in imp.asm.
imp:    movsw
        nop

; Data: the drift of the next lap.
drift:  dw      0

end:
