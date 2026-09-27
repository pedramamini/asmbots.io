; Kraken is three scanners in parallel, its arms: each has its own code and its own process, and
; each sweeps a third of the core, down from under the body.
; An arm folds 16 words 32 bytes apart into dx for each jump, and on a hit it strikes from 48 bytes
; above the hit down: 32 bombs 2 bytes apart, a solid carpet that stops an imp on its way up, then
; 48 bombs 8 bytes apart over the next 384 bytes, which break the loops of a big bot wherever in
; its body they run.
; At the bottom of its sector an arm moves on to the next one, and from the last sector back to the
; first, 2 bytes lower, so each sector gets each arm in turn and a dead arm leaves no hole for long.
; The arms share no code, so a bomb or a carpet that kills one arm leaves two to hunt.
; The three arms are what make it a heavyweight: they are 1,185 of its 1,218 bytes, all three
; run, and each runs its unrolled strike on every hit.
; vs imp.asm, seeds 1..20: 20 W / 0 T / 0 L
; vs dwarf.asm, seeds 1..20: 19 W / 0 T / 1 L

%name     "Kraken"
%author   "ASM Bots"
%strategy "Three scanners in parallel, each sweeping its own sector"

ARMS    equ     3                       ; scanners, one process each
K       equ     32                      ; bytes between sampled words
N       equ     16                      ; words an arm folds for each jump
BLOCK   equ     N * K                   ; bytes a fold covers
TOP     equ     48                      ; the strike starts this far above the hit
DENSE   equ     32                      ; bombs 2 bytes apart at the top of a strike
SPARSE  equ     48                      ; and bombs STRIDE bytes apart under them
STRIDE  equ     8                       ; bytes between the sparse bombs
BELOW   equ     TOP + 4                 ; the first sector starts this far under the body
ABOVE   equ     2 * DENSE + STRIDE * SPARSE - TOP + K ; and the last one ends this far over it
SIZE    equ     end - start
BLOCKS  equ     (0x10000 - SIZE - BELOW - ABOVE) / ARMS / BLOCK ; blocks in a sector
SECT    equ     BLOCKS * BLOCK          ; bytes in a sector
ARM     equ     arm1 - arm0             ; bytes in an arm

; Launch: bp is the top of a sector and si the arm that sweeps it; start the others and be the last.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        xor     ax, ax                  ; ax = 0 for the scan and for the carpet
        std                             ; scasw and stosw step down
        lea     bp, [bx-BELOW]
        lea     si, [bx+arm0]
        mov     cx, ARMS - 1
.go:    spl     si
        sub     bp, SECT
        add     si, ARM
        loop    .go
        jmp     si

; Arms: each folds N words K bytes apart into dx, block by block down its sector, carpets what
; it finds, and at the bottom moves on to the next sector, the last one back to the first.
arm0:   mov     di, bp
        mov     si, BLOCKS
.scan:  mov     dx, [di]
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
        jnz     .find
.next:  sub     di, BLOCK
        dec     si
        jz      .turn
        jmp     .scan
.turn:  sub     bp, SECT                ; the next sector
        mov     dx, bx
        sub     dx, bp
        sub     dx, BELOW + ARMS * SECT ; dx = the drift, past the last sector
        cmp     dx, K
        jae     .again
        add     dx, 2                   ; the first sector again, 2 bytes lower
        and     dx, K - 1
        lea     bp, [bx-BELOW]
        sub     bp, dx
.again: jmp     arm0
.find:  mov     dx, di                  ; dx = the top of the block
        mov     cx, BLOCK / 2
        repe    scasw                   ; stops with di two bytes under the hit
        jne     .hit
        jmp     .next
.hit:   add     di, 2
        mov     [di+48], ax
        mov     [di+46], ax
        mov     [di+44], ax
        mov     [di+42], ax
        mov     [di+40], ax
        mov     [di+38], ax
        mov     [di+36], ax
        mov     [di+34], ax
        mov     [di+32], ax
        mov     [di+30], ax
        mov     [di+28], ax
        mov     [di+26], ax
        mov     [di+24], ax
        mov     [di+22], ax
        mov     [di+20], ax
        mov     [di+18], ax
        mov     [di+16], ax
        mov     [di+14], ax
        mov     [di+12], ax
        mov     [di+10], ax
        mov     [di+8], ax
        mov     [di+6], ax
        mov     [di+4], ax
        mov     [di+2], ax
        mov     [di], ax
        mov     [di-2], ax
        mov     [di-4], ax
        mov     [di-6], ax
        mov     [di-8], ax
        mov     [di-10], ax
        mov     [di-12], ax
        mov     [di-14], ax
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
        mov     [di-264], ax
        mov     [di-272], ax
        mov     [di-280], ax
        mov     [di-288], ax
        mov     [di-296], ax
        mov     [di-304], ax
        mov     [di-312], ax
        mov     [di-320], ax
        mov     [di-328], ax
        mov     [di-336], ax
        mov     [di-344], ax
        mov     [di-352], ax
        mov     [di-360], ax
        mov     [di-368], ax
        mov     [di-376], ax
        mov     [di-384], ax
        mov     [di-392], ax
        mov     di, dx
        jmp     .next

arm1:   mov     di, bp
        mov     si, BLOCKS
.scan:  mov     dx, [di]
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
        jnz     .find
.next:  sub     di, BLOCK
        dec     si
        jz      .turn
        jmp     .scan
.turn:  sub     bp, SECT                ; the next sector
        mov     dx, bx
        sub     dx, bp
        sub     dx, BELOW + ARMS * SECT ; dx = the drift, past the last sector
        cmp     dx, K
        jae     .again
        add     dx, 2                   ; the first sector again, 2 bytes lower
        and     dx, K - 1
        lea     bp, [bx-BELOW]
        sub     bp, dx
.again: jmp     arm1
.find:  mov     dx, di                  ; dx = the top of the block
        mov     cx, BLOCK / 2
        repe    scasw                   ; stops with di two bytes under the hit
        jne     .hit
        jmp     .next
.hit:   add     di, 2
        mov     [di+48], ax
        mov     [di+46], ax
        mov     [di+44], ax
        mov     [di+42], ax
        mov     [di+40], ax
        mov     [di+38], ax
        mov     [di+36], ax
        mov     [di+34], ax
        mov     [di+32], ax
        mov     [di+30], ax
        mov     [di+28], ax
        mov     [di+26], ax
        mov     [di+24], ax
        mov     [di+22], ax
        mov     [di+20], ax
        mov     [di+18], ax
        mov     [di+16], ax
        mov     [di+14], ax
        mov     [di+12], ax
        mov     [di+10], ax
        mov     [di+8], ax
        mov     [di+6], ax
        mov     [di+4], ax
        mov     [di+2], ax
        mov     [di], ax
        mov     [di-2], ax
        mov     [di-4], ax
        mov     [di-6], ax
        mov     [di-8], ax
        mov     [di-10], ax
        mov     [di-12], ax
        mov     [di-14], ax
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
        mov     [di-264], ax
        mov     [di-272], ax
        mov     [di-280], ax
        mov     [di-288], ax
        mov     [di-296], ax
        mov     [di-304], ax
        mov     [di-312], ax
        mov     [di-320], ax
        mov     [di-328], ax
        mov     [di-336], ax
        mov     [di-344], ax
        mov     [di-352], ax
        mov     [di-360], ax
        mov     [di-368], ax
        mov     [di-376], ax
        mov     [di-384], ax
        mov     [di-392], ax
        mov     di, dx
        jmp     .next

arm2:   mov     di, bp
        mov     si, BLOCKS
.scan:  mov     dx, [di]
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
        jnz     .find
.next:  sub     di, BLOCK
        dec     si
        jz      .turn
        jmp     .scan
.turn:  sub     bp, SECT                ; the next sector
        mov     dx, bx
        sub     dx, bp
        sub     dx, BELOW + ARMS * SECT ; dx = the drift, past the last sector
        cmp     dx, K
        jae     .again
        add     dx, 2                   ; the first sector again, 2 bytes lower
        and     dx, K - 1
        lea     bp, [bx-BELOW]
        sub     bp, dx
.again: jmp     arm2
.find:  mov     dx, di                  ; dx = the top of the block
        mov     cx, BLOCK / 2
        repe    scasw                   ; stops with di two bytes under the hit
        jne     .hit
        jmp     .next
.hit:   add     di, 2
        mov     [di+48], ax
        mov     [di+46], ax
        mov     [di+44], ax
        mov     [di+42], ax
        mov     [di+40], ax
        mov     [di+38], ax
        mov     [di+36], ax
        mov     [di+34], ax
        mov     [di+32], ax
        mov     [di+30], ax
        mov     [di+28], ax
        mov     [di+26], ax
        mov     [di+24], ax
        mov     [di+22], ax
        mov     [di+20], ax
        mov     [di+18], ax
        mov     [di+16], ax
        mov     [di+14], ax
        mov     [di+12], ax
        mov     [di+10], ax
        mov     [di+8], ax
        mov     [di+6], ax
        mov     [di+4], ax
        mov     [di+2], ax
        mov     [di], ax
        mov     [di-2], ax
        mov     [di-4], ax
        mov     [di-6], ax
        mov     [di-8], ax
        mov     [di-10], ax
        mov     [di-12], ax
        mov     [di-14], ax
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
        mov     [di-264], ax
        mov     [di-272], ax
        mov     [di-280], ax
        mov     [di-288], ax
        mov     [di-296], ax
        mov     [di-304], ax
        mov     [di-312], ax
        mov     [di-320], ax
        mov     [di-328], ax
        mov     [di-336], ax
        mov     [di-344], ax
        mov     [di-352], ax
        mov     [di-360], ax
        mov     [di-368], ax
        mov     [di-376], ax
        mov     [di-384], ax
        mov     [di-392], ax
        mov     di, dx
        jmp     .next

end:
