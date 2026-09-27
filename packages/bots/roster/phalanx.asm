; Phalanx is a wall of eight bombers side by side, each its own copy of one unrolled loop and each
; with a process of its own.
; Each bomber bombs out from the body both ways at once: di walks up from over our end and si walks
; down from under our base, a bomb each 64 bytes, and bomber k starts 8 * k bytes out, so the eight
; together drop a bomb every 8 bytes on each side.
; The core next to the body is bombed first, so a rival that comes at us from either side meets the
; wall before its bombs get here. A lap covers half the core each way, and the next lap starts 2
; bytes farther out, so four laps leave no gap.
; The eight bombers are what make it a heavyweight: they are 1,288 of its 1,322 bytes, and all eight
; run.
; vs imp.asm, seeds 1..20: 19 W / 1 T / 0 L
; vs dwarf.asm, seeds 1..20: 19 W / 0 T / 1 L

%name     "Phalanx"
%author   "ASM Bots"
%strategy "A wall of eight bombers that bomb out from the body both ways"

STRIDE  equ     8                       ; bytes between bombs of the wall
WALL    equ     8                       ; bombers side by side
GAP     equ     WALL * STRIDE           ; bytes between bombs of one bomber
ROW     equ     16                      ; bombs a pointer drops in a pass
PASS    equ     ROW * GAP               ; bytes a pointer moves in a pass
DRIFT   equ     2                       ; each lap starts this much farther out
SIZE    equ     end - start
LAP     equ     (0x10000 - SIZE - 2 * GAP) / 2 / PASS ; passes in a lap: each way covers half the core
BOMBER  equ     b1 - b0                 ; bytes in a bomber

; Setup: the base idiom puts our base address in bp, and ax = 0 is the bomb. Bomber k gets
; dx = k * STRIDE, its place in the wall, and bx = 0, the drift. Start seven and run the eighth.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        mov     bp, bx                  ; bp keeps the base
        xor     ax, ax
        xor     dx, dx
        xor     bx, bx
        lea     si, [bp+b0]
        mov     cx, WALL - 1
.go:    spl     si
        add     dx, STRIDE
        add     si, BOMBER
        loop    .go
        jmp     si

; Bombers: each is its own copy of the same code. di walks up from over our end and si walks
; down from under our base, dx bytes out, each GAP bytes a bomb, so the eight together drop a
; bomb every STRIDE bytes on both sides. A lap covers half the core each way, and the next lap
; starts DRIFT bytes farther out, so four laps leave no gap.
b0:
.lap:   add     bx, DRIFT
        and     bx, STRIDE - DRIFT
        lea     di, [bp+SIZE]
        add     di, bx
        add     di, dx
        lea     si, [bp-2]
        sub     si, bx
        sub     si, dx
        mov     cx, LAP
.pass:
        mov     [di+0*GAP], ax
        mov     [di+1*GAP], ax
        mov     [di+2*GAP], ax
        mov     [di+3*GAP], ax
        mov     [di+4*GAP], ax
        mov     [di+5*GAP], ax
        mov     [di+6*GAP], ax
        mov     [di+7*GAP], ax
        mov     [di+8*GAP], ax
        mov     [di+9*GAP], ax
        mov     [di+10*GAP], ax
        mov     [di+11*GAP], ax
        mov     [di+12*GAP], ax
        mov     [di+13*GAP], ax
        mov     [di+14*GAP], ax
        mov     [di+15*GAP], ax
        mov     [si-0*GAP], ax
        mov     [si-1*GAP], ax
        mov     [si-2*GAP], ax
        mov     [si-3*GAP], ax
        mov     [si-4*GAP], ax
        mov     [si-5*GAP], ax
        mov     [si-6*GAP], ax
        mov     [si-7*GAP], ax
        mov     [si-8*GAP], ax
        mov     [si-9*GAP], ax
        mov     [si-10*GAP], ax
        mov     [si-11*GAP], ax
        mov     [si-12*GAP], ax
        mov     [si-13*GAP], ax
        mov     [si-14*GAP], ax
        mov     [si-15*GAP], ax
        add     di, PASS
        sub     si, PASS
        loop    .next
        jmp     .lap
.next:  jmp     .pass

; Bomber 1: the same bytes as bomber 0.
b1:
.lap:   add     bx, DRIFT
        and     bx, STRIDE - DRIFT
        lea     di, [bp+SIZE]
        add     di, bx
        add     di, dx
        lea     si, [bp-2]
        sub     si, bx
        sub     si, dx
        mov     cx, LAP
.pass:
        mov     [di+0*GAP], ax
        mov     [di+1*GAP], ax
        mov     [di+2*GAP], ax
        mov     [di+3*GAP], ax
        mov     [di+4*GAP], ax
        mov     [di+5*GAP], ax
        mov     [di+6*GAP], ax
        mov     [di+7*GAP], ax
        mov     [di+8*GAP], ax
        mov     [di+9*GAP], ax
        mov     [di+10*GAP], ax
        mov     [di+11*GAP], ax
        mov     [di+12*GAP], ax
        mov     [di+13*GAP], ax
        mov     [di+14*GAP], ax
        mov     [di+15*GAP], ax
        mov     [si-0*GAP], ax
        mov     [si-1*GAP], ax
        mov     [si-2*GAP], ax
        mov     [si-3*GAP], ax
        mov     [si-4*GAP], ax
        mov     [si-5*GAP], ax
        mov     [si-6*GAP], ax
        mov     [si-7*GAP], ax
        mov     [si-8*GAP], ax
        mov     [si-9*GAP], ax
        mov     [si-10*GAP], ax
        mov     [si-11*GAP], ax
        mov     [si-12*GAP], ax
        mov     [si-13*GAP], ax
        mov     [si-14*GAP], ax
        mov     [si-15*GAP], ax
        add     di, PASS
        sub     si, PASS
        loop    .next
        jmp     .lap
.next:  jmp     .pass

; Bomber 2: the same bytes as bomber 0.
b2:
.lap:   add     bx, DRIFT
        and     bx, STRIDE - DRIFT
        lea     di, [bp+SIZE]
        add     di, bx
        add     di, dx
        lea     si, [bp-2]
        sub     si, bx
        sub     si, dx
        mov     cx, LAP
.pass:
        mov     [di+0*GAP], ax
        mov     [di+1*GAP], ax
        mov     [di+2*GAP], ax
        mov     [di+3*GAP], ax
        mov     [di+4*GAP], ax
        mov     [di+5*GAP], ax
        mov     [di+6*GAP], ax
        mov     [di+7*GAP], ax
        mov     [di+8*GAP], ax
        mov     [di+9*GAP], ax
        mov     [di+10*GAP], ax
        mov     [di+11*GAP], ax
        mov     [di+12*GAP], ax
        mov     [di+13*GAP], ax
        mov     [di+14*GAP], ax
        mov     [di+15*GAP], ax
        mov     [si-0*GAP], ax
        mov     [si-1*GAP], ax
        mov     [si-2*GAP], ax
        mov     [si-3*GAP], ax
        mov     [si-4*GAP], ax
        mov     [si-5*GAP], ax
        mov     [si-6*GAP], ax
        mov     [si-7*GAP], ax
        mov     [si-8*GAP], ax
        mov     [si-9*GAP], ax
        mov     [si-10*GAP], ax
        mov     [si-11*GAP], ax
        mov     [si-12*GAP], ax
        mov     [si-13*GAP], ax
        mov     [si-14*GAP], ax
        mov     [si-15*GAP], ax
        add     di, PASS
        sub     si, PASS
        loop    .next
        jmp     .lap
.next:  jmp     .pass

; Bomber 3: the same bytes as bomber 0.
b3:
.lap:   add     bx, DRIFT
        and     bx, STRIDE - DRIFT
        lea     di, [bp+SIZE]
        add     di, bx
        add     di, dx
        lea     si, [bp-2]
        sub     si, bx
        sub     si, dx
        mov     cx, LAP
.pass:
        mov     [di+0*GAP], ax
        mov     [di+1*GAP], ax
        mov     [di+2*GAP], ax
        mov     [di+3*GAP], ax
        mov     [di+4*GAP], ax
        mov     [di+5*GAP], ax
        mov     [di+6*GAP], ax
        mov     [di+7*GAP], ax
        mov     [di+8*GAP], ax
        mov     [di+9*GAP], ax
        mov     [di+10*GAP], ax
        mov     [di+11*GAP], ax
        mov     [di+12*GAP], ax
        mov     [di+13*GAP], ax
        mov     [di+14*GAP], ax
        mov     [di+15*GAP], ax
        mov     [si-0*GAP], ax
        mov     [si-1*GAP], ax
        mov     [si-2*GAP], ax
        mov     [si-3*GAP], ax
        mov     [si-4*GAP], ax
        mov     [si-5*GAP], ax
        mov     [si-6*GAP], ax
        mov     [si-7*GAP], ax
        mov     [si-8*GAP], ax
        mov     [si-9*GAP], ax
        mov     [si-10*GAP], ax
        mov     [si-11*GAP], ax
        mov     [si-12*GAP], ax
        mov     [si-13*GAP], ax
        mov     [si-14*GAP], ax
        mov     [si-15*GAP], ax
        add     di, PASS
        sub     si, PASS
        loop    .next
        jmp     .lap
.next:  jmp     .pass

; Bomber 4: the same bytes as bomber 0.
b4:
.lap:   add     bx, DRIFT
        and     bx, STRIDE - DRIFT
        lea     di, [bp+SIZE]
        add     di, bx
        add     di, dx
        lea     si, [bp-2]
        sub     si, bx
        sub     si, dx
        mov     cx, LAP
.pass:
        mov     [di+0*GAP], ax
        mov     [di+1*GAP], ax
        mov     [di+2*GAP], ax
        mov     [di+3*GAP], ax
        mov     [di+4*GAP], ax
        mov     [di+5*GAP], ax
        mov     [di+6*GAP], ax
        mov     [di+7*GAP], ax
        mov     [di+8*GAP], ax
        mov     [di+9*GAP], ax
        mov     [di+10*GAP], ax
        mov     [di+11*GAP], ax
        mov     [di+12*GAP], ax
        mov     [di+13*GAP], ax
        mov     [di+14*GAP], ax
        mov     [di+15*GAP], ax
        mov     [si-0*GAP], ax
        mov     [si-1*GAP], ax
        mov     [si-2*GAP], ax
        mov     [si-3*GAP], ax
        mov     [si-4*GAP], ax
        mov     [si-5*GAP], ax
        mov     [si-6*GAP], ax
        mov     [si-7*GAP], ax
        mov     [si-8*GAP], ax
        mov     [si-9*GAP], ax
        mov     [si-10*GAP], ax
        mov     [si-11*GAP], ax
        mov     [si-12*GAP], ax
        mov     [si-13*GAP], ax
        mov     [si-14*GAP], ax
        mov     [si-15*GAP], ax
        add     di, PASS
        sub     si, PASS
        loop    .next
        jmp     .lap
.next:  jmp     .pass

; Bomber 5: the same bytes as bomber 0.
b5:
.lap:   add     bx, DRIFT
        and     bx, STRIDE - DRIFT
        lea     di, [bp+SIZE]
        add     di, bx
        add     di, dx
        lea     si, [bp-2]
        sub     si, bx
        sub     si, dx
        mov     cx, LAP
.pass:
        mov     [di+0*GAP], ax
        mov     [di+1*GAP], ax
        mov     [di+2*GAP], ax
        mov     [di+3*GAP], ax
        mov     [di+4*GAP], ax
        mov     [di+5*GAP], ax
        mov     [di+6*GAP], ax
        mov     [di+7*GAP], ax
        mov     [di+8*GAP], ax
        mov     [di+9*GAP], ax
        mov     [di+10*GAP], ax
        mov     [di+11*GAP], ax
        mov     [di+12*GAP], ax
        mov     [di+13*GAP], ax
        mov     [di+14*GAP], ax
        mov     [di+15*GAP], ax
        mov     [si-0*GAP], ax
        mov     [si-1*GAP], ax
        mov     [si-2*GAP], ax
        mov     [si-3*GAP], ax
        mov     [si-4*GAP], ax
        mov     [si-5*GAP], ax
        mov     [si-6*GAP], ax
        mov     [si-7*GAP], ax
        mov     [si-8*GAP], ax
        mov     [si-9*GAP], ax
        mov     [si-10*GAP], ax
        mov     [si-11*GAP], ax
        mov     [si-12*GAP], ax
        mov     [si-13*GAP], ax
        mov     [si-14*GAP], ax
        mov     [si-15*GAP], ax
        add     di, PASS
        sub     si, PASS
        loop    .next
        jmp     .lap
.next:  jmp     .pass

; Bomber 6: the same bytes as bomber 0.
b6:
.lap:   add     bx, DRIFT
        and     bx, STRIDE - DRIFT
        lea     di, [bp+SIZE]
        add     di, bx
        add     di, dx
        lea     si, [bp-2]
        sub     si, bx
        sub     si, dx
        mov     cx, LAP
.pass:
        mov     [di+0*GAP], ax
        mov     [di+1*GAP], ax
        mov     [di+2*GAP], ax
        mov     [di+3*GAP], ax
        mov     [di+4*GAP], ax
        mov     [di+5*GAP], ax
        mov     [di+6*GAP], ax
        mov     [di+7*GAP], ax
        mov     [di+8*GAP], ax
        mov     [di+9*GAP], ax
        mov     [di+10*GAP], ax
        mov     [di+11*GAP], ax
        mov     [di+12*GAP], ax
        mov     [di+13*GAP], ax
        mov     [di+14*GAP], ax
        mov     [di+15*GAP], ax
        mov     [si-0*GAP], ax
        mov     [si-1*GAP], ax
        mov     [si-2*GAP], ax
        mov     [si-3*GAP], ax
        mov     [si-4*GAP], ax
        mov     [si-5*GAP], ax
        mov     [si-6*GAP], ax
        mov     [si-7*GAP], ax
        mov     [si-8*GAP], ax
        mov     [si-9*GAP], ax
        mov     [si-10*GAP], ax
        mov     [si-11*GAP], ax
        mov     [si-12*GAP], ax
        mov     [si-13*GAP], ax
        mov     [si-14*GAP], ax
        mov     [si-15*GAP], ax
        add     di, PASS
        sub     si, PASS
        loop    .next
        jmp     .lap
.next:  jmp     .pass

; Bomber 7: the same bytes as bomber 0.
b7:
.lap:   add     bx, DRIFT
        and     bx, STRIDE - DRIFT
        lea     di, [bp+SIZE]
        add     di, bx
        add     di, dx
        lea     si, [bp-2]
        sub     si, bx
        sub     si, dx
        mov     cx, LAP
.pass:
        mov     [di+0*GAP], ax
        mov     [di+1*GAP], ax
        mov     [di+2*GAP], ax
        mov     [di+3*GAP], ax
        mov     [di+4*GAP], ax
        mov     [di+5*GAP], ax
        mov     [di+6*GAP], ax
        mov     [di+7*GAP], ax
        mov     [di+8*GAP], ax
        mov     [di+9*GAP], ax
        mov     [di+10*GAP], ax
        mov     [di+11*GAP], ax
        mov     [di+12*GAP], ax
        mov     [di+13*GAP], ax
        mov     [di+14*GAP], ax
        mov     [di+15*GAP], ax
        mov     [si-0*GAP], ax
        mov     [si-1*GAP], ax
        mov     [si-2*GAP], ax
        mov     [si-3*GAP], ax
        mov     [si-4*GAP], ax
        mov     [si-5*GAP], ax
        mov     [si-6*GAP], ax
        mov     [si-7*GAP], ax
        mov     [si-8*GAP], ax
        mov     [si-9*GAP], ax
        mov     [si-10*GAP], ax
        mov     [si-11*GAP], ax
        mov     [si-12*GAP], ax
        mov     [si-13*GAP], ax
        mov     [si-14*GAP], ax
        mov     [si-15*GAP], ax
        add     di, PASS
        sub     si, PASS
        loop    .next
        jmp     .lap
.next:  jmp     .pass

end:
