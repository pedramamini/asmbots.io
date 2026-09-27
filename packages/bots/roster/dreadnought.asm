; Dreadnought is a bomber with three unrolled bomb loops and a spare copy of all three, and two
; bomber processes run the loops in turn: loop A walks up from the top of the body, loop B walks
; down from the base, and loop C walks both ways at once.
; A pass drops 128 DAT words 8 bytes apart through four pointers, and each lap moves its bombs 2
; bytes from the last one, so four laps leave no gap.
; At the end of each lap a bomber mends the live copy from the spare with repe cmpsw: where two
; words differ, a zero byte in the spare means the spare was hit, else the live copy was, and the
; good word goes over the bad one.
; The spare is 1,430 bytes after the live copy, 2 more than a multiple of 4, so the DAT words of a
; dwarf, 4 bytes apart, never break the same word in both copies.
; The bombers count their lap ends in one word: when two laps of one bomber go by with no lap end
; from the other, the other is dead, and the live one starts a new bomber on the loop after next.
; Loop A bombs up three times as fast as a dwarf bombs down, so it gets to a dwarf over us first.
; The live copy and the spare are what make Dreadnought a super-heavy: they are 2,856 of its 2,872
; bytes, the live loops run, and each mend reads the spare.
; vs imp.asm, seeds 1..20: 20 W / 0 T / 0 L
; vs dwarf.asm, seeds 1..20: 20 W / 0 T / 0 L

%name     "Dreadnought"
%author   "ASM Bots"
%strategy "Three unrolled bomb loops that mend from a spare copy"

STRIDE  equ     8                       ; bytes between bombs
REACH   equ     16 * STRIDE             ; a pointer bombs from REACH under it to REACH - STRIDE over it
SPAN    equ     2 * REACH               ; bytes one pointer covers in a pass
PASS    equ     4 * SPAN                ; bytes a pass covers: four pointers
SIZE    equ     end - start
LAP     equ     (0x10000 - SIZE - 8) / PASS ; passes in a lap: the last bomb lands short of the body
WORDS   equ     (laps - live) / 2       ; words in the live copy

; Setup: the base idiom puts our base address in dx, since bx is a bomb pointer; start a second
; bomber on loop B and run loop A.
start:  call    .here
.here:  pop     dx
        sub     dx, .here
        xor     sp, sp                  ; sp keeps two lap counts: the bombers never push
        spl     lap_b
        jmp     lap_a

; Live: the three loops and the mend, which the bombers run.
live:
; Loop A: four pointers walk up from the top of the body, 128 bombs a pass, 1 KB.
lap_a:
        mov     bx, dx
        mov     ax, [bx+laps]
        and     ax, 6                   ; the phase of this lap, 0, 2, 4, or 6
        lea     di, [bx+SIZE+REACH]
        add     di, ax
        lea     si, [di+SPAN]
        lea     bp, [di+2*SPAN]
        lea     bx, [di+3*SPAN]
        mov     cx, LAP
        xor     ax, ax                  ; ax = 0 is the bomb
.pass:
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
        add     di, PASS
        add     si, PASS
        add     bp, PASS
        add     bx, PASS
        loop    .next
        mov     bp, lap_b               ; the next loop
        mov     di, lap_c               ; and the one after it
        mov     bx, mend                ; an absolute jump, the same bytes in the spare
        add     bx, dx
        jmp     bx
.next:  jmp     .pass

; Loop B: four pointers walk down from the base.
lap_b:
        mov     bx, dx
        mov     ax, [bx+laps]
        and     ax, 6
        lea     di, [bx-REACH]
        sub     di, ax
        lea     si, [di-SPAN]
        lea     bp, [di-2*SPAN]
        lea     bx, [di-3*SPAN]
        mov     cx, LAP
        xor     ax, ax
.pass:
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
        sub     di, PASS
        sub     si, PASS
        sub     bp, PASS
        sub     bx, PASS
        loop    .next
        mov     bp, lap_c
        mov     di, lap_a
        mov     bx, mend
        add     bx, dx
        jmp     bx
.next:  jmp     .pass

; Loop C: two pointers walk up from the top and two walk down from the base, 512 bytes each way.
lap_c:
        mov     bx, dx
        mov     ax, [bx+laps]
        and     ax, 6
        lea     di, [bx+SIZE+REACH]
        add     di, ax
        lea     si, [di+SPAN]
        lea     bp, [bx-REACH]
        sub     bp, ax
        lea     bx, [bp-SPAN]
        mov     cx, LAP
        xor     ax, ax
.pass:
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
        add     di, PASS / 2
        add     si, PASS / 2
        sub     bp, PASS / 2
        sub     bx, PASS / 2
        loop    .next
        mov     bp, lap_a
        mov     di, lap_b
        mov     bx, mend
        add     bx, dx
        jmp     bx
.next:  jmp     .pass

; Mend: bp is the next loop and di the one after it. One more lap end; if the other bomber ended
; no lap in the last two laps of this one, it is dead: start a new one on the loop after next.
mend:   mov     bx, dx
        inc     byte [bx+laps]          ; in one instruction: the other bomber may be here too
        mov     cx, sp                  ; ch, cl: the lap count after this process's last two lap ends
        mov     al, [bx+laps]
        sub     al, ch
        cmp     al, 3
        jae     .alive
        add     di, dx
        spl     di
.alive: mov     ch, cl
        mov     cl, [bx+laps]
        mov     sp, cx
        cld
        lea     si, [bx+spare]
        lea     di, [bx+live]
        mov     cx, WORDS

; Compare the live copy with the spare word by word, mend each word that differs, and run the next
; loop.
.check: repe    cmpsw
        jne     .fix
.done:  add     bp, dx
        jmp     bp

; Fix: find the byte that differs; zero in the spare means the spare is hit, else the live copy is.
.fix:   sub     si, 2
        sub     di, 2
        mov     ax, [si]
        cmp     al, [di]
        jne     .low
        mov     al, ah                  ; the low bytes agree: look at the high ones
.low:   test    al, al
        jz      .spare
        mov     ax, [si]
        mov     [di], ax                ; mend the live copy from the spare
        jmp     .on
.spare: mov     ax, [di]
        mov     [si], ax                ; mend the spare from the live copy
.on:    add     si, 2
        add     di, 2
        jcxz    .done
        jmp     .check

; Data: the lap count, one more at each lap end of either bomber. Its bits 1 and 2 are the phase.
laps:   dw      2

; Spare: the same bytes as the live copy. It never runs: each mend reads it.
spare:
; Spare of loop A.
lap_a_s:
        mov     bx, dx
        mov     ax, [bx+laps]
        and     ax, 6
        lea     di, [bx+SIZE+REACH]
        add     di, ax
        lea     si, [di+SPAN]
        lea     bp, [di+2*SPAN]
        lea     bx, [di+3*SPAN]
        mov     cx, LAP
        xor     ax, ax
.pass:
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
        add     di, PASS
        add     si, PASS
        add     bp, PASS
        add     bx, PASS
        loop    .next
        mov     bp, lap_b
        mov     di, lap_c
        mov     bx, mend
        add     bx, dx
        jmp     bx
.next:  jmp     .pass

; Spare of loop B.
lap_b_s:
        mov     bx, dx
        mov     ax, [bx+laps]
        and     ax, 6
        lea     di, [bx-REACH]
        sub     di, ax
        lea     si, [di-SPAN]
        lea     bp, [di-2*SPAN]
        lea     bx, [di-3*SPAN]
        mov     cx, LAP
        xor     ax, ax
.pass:
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
        sub     di, PASS
        sub     si, PASS
        sub     bp, PASS
        sub     bx, PASS
        loop    .next
        mov     bp, lap_c
        mov     di, lap_a
        mov     bx, mend
        add     bx, dx
        jmp     bx
.next:  jmp     .pass

; Spare of loop C.
lap_c_s:
        mov     bx, dx
        mov     ax, [bx+laps]
        and     ax, 6
        lea     di, [bx+SIZE+REACH]
        add     di, ax
        lea     si, [di+SPAN]
        lea     bp, [bx-REACH]
        sub     bp, ax
        lea     bx, [bp-SPAN]
        mov     cx, LAP
        xor     ax, ax
.pass:
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
        add     di, PASS / 2
        add     si, PASS / 2
        sub     bp, PASS / 2
        sub     bx, PASS / 2
        loop    .next
        mov     bp, lap_a
        mov     di, lap_b
        mov     bx, mend
        add     bx, dx
        jmp     bx
.next:  jmp     .pass

; Spare of the mend.
mend_s: mov     bx, dx
        inc     byte [bx+laps]
        mov     cx, sp
        mov     al, [bx+laps]
        sub     al, ch
        cmp     al, 3
        jae     .alive
        add     di, dx
        spl     di
.alive: mov     ch, cl
        mov     cl, [bx+laps]
        mov     sp, cx
        cld
        lea     si, [bx+spare]
        lea     di, [bx+live]
        mov     cx, WORDS
.check: repe    cmpsw
        jne     .fix
.done:  add     bp, dx
        jmp     bp
.fix:   sub     si, 2
        sub     di, 2
        mov     ax, [si]
        cmp     al, [di]
        jne     .low
        mov     al, ah
.low:   test    al, al
        jz      .spare
        mov     ax, [si]
        mov     [di], ax
        jmp     .on
.spare: mov     ax, [di]
        mov     [si], ax
.on:    add     si, 2
        add     di, 2
        jcxz    .done
        jmp     .check

end:
