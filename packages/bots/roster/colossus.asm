; Colossus runs six bombers at once, each its own copy of an unrolled loop, with the prime
; strides 11, 13, 17, 19, 23, and 29 bytes. Four bomb up the core from over our end and two bomb
; down from under our base, three pointers and one jump a pass.
; Each lap of a bomber starts one byte on from its last, so each bomber lays a new pattern each lap,
; and the six primes leave no gap that a small rival can sit in for long.
; A bomber that walks down toward us is met by the four that walk up before its bombs get here, and
; a bomb that lands on one of our bombers leaves the other five running.
; The six unrolled loops are what make it a heavyweight: they are 1,170 of its 1,196 bytes, and
; all six run.
; vs imp.asm, seeds 1..20: 17 W / 2 T / 1 L
; vs dwarf.asm, seeds 1..20: 20 W / 0 T / 0 L

%name     "Colossus"
%author   "ASM Bots"
%strategy "Six bombers with six prime strides, up and down"

S0      equ     11                      ; bomber 0: bytes between bombs, and it bombs up
S1      equ     13                      ; bomber 1: bytes between bombs, and it bombs up
S2      equ     17                      ; bomber 2: bytes between bombs, and it bombs down
S3      equ     19                      ; bomber 3: bytes between bombs, and it bombs up
S4      equ     23                      ; bomber 4: bytes between bombs, and it bombs up
S5      equ     29                      ; bomber 5: bytes between bombs, and it bombs down
PTRS    equ     3                       ; pointers in a pass: di, si, and bx
SIZE    equ     end - start

; Setup: the base idiom puts our base address in bp, as bx is a bomb pointer; ax = 0 is the bomb.
; Start five bombers and run the sixth.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        mov     bp, bx                  ; bp keeps the base
        xor     ax, ax
        spl     b1
        spl     b2
        spl     b3
        spl     b4
        spl     b5

; Bomber 0: 24 bombs a pointer, 72 a pass, 11 bytes apart, up from over our end.
; Each lap starts one byte higher than the last, so 11 laps hit every byte.
b0:
.lap:   mov     si, [bp+.dr]
        inc     si
        cmp     si, S0
        jb      .ok
        xor     si, si
.ok:    mov     [bp+.dr], si            ; this lap's drift
        lea     di, [bp+si+SIZE+127]
        lea     si, [di+24*S0]
        lea     bx, [si+24*S0]
        mov     cx, (0x10000 - SIZE) / (PTRS * 24 * S0) ; passes in a lap
.pass:
        mov     [di-127], ax
        mov     [di-116], ax
        mov     [di-105], ax
        mov     [di-94], ax
        mov     [di-83], ax
        mov     [di-72], ax
        mov     [di-61], ax
        mov     [di-50], ax
        mov     [di-39], ax
        mov     [di-28], ax
        mov     [di-17], ax
        mov     [di-6], ax
        mov     [di+5], ax
        mov     [di+16], ax
        mov     [di+27], ax
        mov     [di+38], ax
        mov     [di+49], ax
        mov     [di+60], ax
        mov     [di+71], ax
        mov     [di+82], ax
        mov     [di+93], ax
        mov     [di+104], ax
        mov     [di+115], ax
        mov     [di+126], ax
        mov     [si-127], ax
        mov     [si-116], ax
        mov     [si-105], ax
        mov     [si-94], ax
        mov     [si-83], ax
        mov     [si-72], ax
        mov     [si-61], ax
        mov     [si-50], ax
        mov     [si-39], ax
        mov     [si-28], ax
        mov     [si-17], ax
        mov     [si-6], ax
        mov     [si+5], ax
        mov     [si+16], ax
        mov     [si+27], ax
        mov     [si+38], ax
        mov     [si+49], ax
        mov     [si+60], ax
        mov     [si+71], ax
        mov     [si+82], ax
        mov     [si+93], ax
        mov     [si+104], ax
        mov     [si+115], ax
        mov     [si+126], ax
        mov     [bx-127], ax
        mov     [bx-116], ax
        mov     [bx-105], ax
        mov     [bx-94], ax
        mov     [bx-83], ax
        mov     [bx-72], ax
        mov     [bx-61], ax
        mov     [bx-50], ax
        mov     [bx-39], ax
        mov     [bx-28], ax
        mov     [bx-17], ax
        mov     [bx-6], ax
        mov     [bx+5], ax
        mov     [bx+16], ax
        mov     [bx+27], ax
        mov     [bx+38], ax
        mov     [bx+49], ax
        mov     [bx+60], ax
        mov     [bx+71], ax
        mov     [bx+82], ax
        mov     [bx+93], ax
        mov     [bx+104], ax
        mov     [bx+115], ax
        mov     [bx+126], ax
        add     di, PTRS * 24 * S0
        add     si, PTRS * 24 * S0
        add     bx, PTRS * 24 * S0
        loop    .next
        jmp     .lap
.next:  jmp     .pass
.dr:    dw      0                       ; data: the drift of the last lap

; Bomber 1: 20 bombs a pointer, 60 a pass, 13 bytes apart, up from over our end.
; Each lap starts one byte higher than the last, so 13 laps hit every byte.
b1:
.lap:   mov     si, [bp+.dr]
        inc     si
        cmp     si, S1
        jb      .ok
        xor     si, si
.ok:    mov     [bp+.dr], si            ; this lap's drift
        lea     di, [bp+si+SIZE+124]
        lea     si, [di+20*S1]
        lea     bx, [si+20*S1]
        mov     cx, (0x10000 - SIZE) / (PTRS * 20 * S1) ; passes in a lap
.pass:
        mov     [di-124], ax
        mov     [di-111], ax
        mov     [di-98], ax
        mov     [di-85], ax
        mov     [di-72], ax
        mov     [di-59], ax
        mov     [di-46], ax
        mov     [di-33], ax
        mov     [di-20], ax
        mov     [di-7], ax
        mov     [di+6], ax
        mov     [di+19], ax
        mov     [di+32], ax
        mov     [di+45], ax
        mov     [di+58], ax
        mov     [di+71], ax
        mov     [di+84], ax
        mov     [di+97], ax
        mov     [di+110], ax
        mov     [di+123], ax
        mov     [si-124], ax
        mov     [si-111], ax
        mov     [si-98], ax
        mov     [si-85], ax
        mov     [si-72], ax
        mov     [si-59], ax
        mov     [si-46], ax
        mov     [si-33], ax
        mov     [si-20], ax
        mov     [si-7], ax
        mov     [si+6], ax
        mov     [si+19], ax
        mov     [si+32], ax
        mov     [si+45], ax
        mov     [si+58], ax
        mov     [si+71], ax
        mov     [si+84], ax
        mov     [si+97], ax
        mov     [si+110], ax
        mov     [si+123], ax
        mov     [bx-124], ax
        mov     [bx-111], ax
        mov     [bx-98], ax
        mov     [bx-85], ax
        mov     [bx-72], ax
        mov     [bx-59], ax
        mov     [bx-46], ax
        mov     [bx-33], ax
        mov     [bx-20], ax
        mov     [bx-7], ax
        mov     [bx+6], ax
        mov     [bx+19], ax
        mov     [bx+32], ax
        mov     [bx+45], ax
        mov     [bx+58], ax
        mov     [bx+71], ax
        mov     [bx+84], ax
        mov     [bx+97], ax
        mov     [bx+110], ax
        mov     [bx+123], ax
        add     di, PTRS * 20 * S1
        add     si, PTRS * 20 * S1
        add     bx, PTRS * 20 * S1
        loop    .next
        jmp     .lap
.next:  jmp     .pass
.dr:    dw      0                       ; data: the drift of the last lap

; Bomber 2: 16 bombs a pointer, 48 a pass, 17 bytes apart, down from under our base.
; Each lap starts one byte lower than the last, so 17 laps hit every byte.
b2:
.lap:   mov     si, [bp+.dr]
        inc     si
        cmp     si, S2
        jb      .ok
        xor     si, si
.ok:    mov     [bp+.dr], si            ; this lap's drift
        lea     di, [bp-2-127]
        sub     di, si
        lea     si, [di-16*S2]
        lea     bx, [si-16*S2]
        mov     cx, (0x10000 - SIZE - 2 * S2) / (PTRS * 16 * S2) ; passes in a lap
.pass:
        mov     [di+127], ax
        mov     [di+110], ax
        mov     [di+93], ax
        mov     [di+76], ax
        mov     [di+59], ax
        mov     [di+42], ax
        mov     [di+25], ax
        mov     [di+8], ax
        mov     [di-9], ax
        mov     [di-26], ax
        mov     [di-43], ax
        mov     [di-60], ax
        mov     [di-77], ax
        mov     [di-94], ax
        mov     [di-111], ax
        mov     [di-128], ax
        mov     [si+127], ax
        mov     [si+110], ax
        mov     [si+93], ax
        mov     [si+76], ax
        mov     [si+59], ax
        mov     [si+42], ax
        mov     [si+25], ax
        mov     [si+8], ax
        mov     [si-9], ax
        mov     [si-26], ax
        mov     [si-43], ax
        mov     [si-60], ax
        mov     [si-77], ax
        mov     [si-94], ax
        mov     [si-111], ax
        mov     [si-128], ax
        mov     [bx+127], ax
        mov     [bx+110], ax
        mov     [bx+93], ax
        mov     [bx+76], ax
        mov     [bx+59], ax
        mov     [bx+42], ax
        mov     [bx+25], ax
        mov     [bx+8], ax
        mov     [bx-9], ax
        mov     [bx-26], ax
        mov     [bx-43], ax
        mov     [bx-60], ax
        mov     [bx-77], ax
        mov     [bx-94], ax
        mov     [bx-111], ax
        mov     [bx-128], ax
        sub     di, PTRS * 16 * S2
        sub     si, PTRS * 16 * S2
        sub     bx, PTRS * 16 * S2
        loop    .next
        jmp     .lap
.next:  jmp     .pass
.dr:    dw      0                       ; data: the drift of the last lap

; Bomber 3: 14 bombs a pointer, 42 a pass, 19 bytes apart, up from over our end.
; Each lap starts one byte higher than the last, so 19 laps hit every byte.
b3:
.lap:   mov     si, [bp+.dr]
        inc     si
        cmp     si, S3
        jb      .ok
        xor     si, si
.ok:    mov     [bp+.dr], si            ; this lap's drift
        lea     di, [bp+si+SIZE+124]
        lea     si, [di+14*S3]
        lea     bx, [si+14*S3]
        mov     cx, (0x10000 - SIZE) / (PTRS * 14 * S3) ; passes in a lap
.pass:
        mov     [di-124], ax
        mov     [di-105], ax
        mov     [di-86], ax
        mov     [di-67], ax
        mov     [di-48], ax
        mov     [di-29], ax
        mov     [di-10], ax
        mov     [di+9], ax
        mov     [di+28], ax
        mov     [di+47], ax
        mov     [di+66], ax
        mov     [di+85], ax
        mov     [di+104], ax
        mov     [di+123], ax
        mov     [si-124], ax
        mov     [si-105], ax
        mov     [si-86], ax
        mov     [si-67], ax
        mov     [si-48], ax
        mov     [si-29], ax
        mov     [si-10], ax
        mov     [si+9], ax
        mov     [si+28], ax
        mov     [si+47], ax
        mov     [si+66], ax
        mov     [si+85], ax
        mov     [si+104], ax
        mov     [si+123], ax
        mov     [bx-124], ax
        mov     [bx-105], ax
        mov     [bx-86], ax
        mov     [bx-67], ax
        mov     [bx-48], ax
        mov     [bx-29], ax
        mov     [bx-10], ax
        mov     [bx+9], ax
        mov     [bx+28], ax
        mov     [bx+47], ax
        mov     [bx+66], ax
        mov     [bx+85], ax
        mov     [bx+104], ax
        mov     [bx+123], ax
        add     di, PTRS * 14 * S3
        add     si, PTRS * 14 * S3
        add     bx, PTRS * 14 * S3
        loop    .next
        jmp     .lap
.next:  jmp     .pass
.dr:    dw      0                       ; data: the drift of the last lap

; Bomber 4: 12 bombs a pointer, 36 a pass, 23 bytes apart, up from over our end.
; Each lap starts one byte higher than the last, so 23 laps hit every byte.
b4:
.lap:   mov     si, [bp+.dr]
        inc     si
        cmp     si, S4
        jb      .ok
        xor     si, si
.ok:    mov     [bp+.dr], si            ; this lap's drift
        lea     di, [bp+si+SIZE+127]
        lea     si, [di+12*S4]
        lea     bx, [si+12*S4]
        mov     cx, (0x10000 - SIZE) / (PTRS * 12 * S4) ; passes in a lap
.pass:
        mov     [di-127], ax
        mov     [di-104], ax
        mov     [di-81], ax
        mov     [di-58], ax
        mov     [di-35], ax
        mov     [di-12], ax
        mov     [di+11], ax
        mov     [di+34], ax
        mov     [di+57], ax
        mov     [di+80], ax
        mov     [di+103], ax
        mov     [di+126], ax
        mov     [si-127], ax
        mov     [si-104], ax
        mov     [si-81], ax
        mov     [si-58], ax
        mov     [si-35], ax
        mov     [si-12], ax
        mov     [si+11], ax
        mov     [si+34], ax
        mov     [si+57], ax
        mov     [si+80], ax
        mov     [si+103], ax
        mov     [si+126], ax
        mov     [bx-127], ax
        mov     [bx-104], ax
        mov     [bx-81], ax
        mov     [bx-58], ax
        mov     [bx-35], ax
        mov     [bx-12], ax
        mov     [bx+11], ax
        mov     [bx+34], ax
        mov     [bx+57], ax
        mov     [bx+80], ax
        mov     [bx+103], ax
        mov     [bx+126], ax
        add     di, PTRS * 12 * S4
        add     si, PTRS * 12 * S4
        add     bx, PTRS * 12 * S4
        loop    .next
        jmp     .lap
.next:  jmp     .pass
.dr:    dw      0                       ; data: the drift of the last lap

; Bomber 5: 9 bombs a pointer, 27 a pass, 29 bytes apart, down from under our base.
; Each lap starts one byte lower than the last, so 29 laps hit every byte.
b5:
.lap:   mov     si, [bp+.dr]
        inc     si
        cmp     si, S5
        jb      .ok
        xor     si, si
.ok:    mov     [bp+.dr], si            ; this lap's drift
        lea     di, [bp-2-116]
        sub     di, si
        lea     si, [di-9*S5]
        lea     bx, [si-9*S5]
        mov     cx, (0x10000 - SIZE - 2 * S5) / (PTRS * 9 * S5) ; passes in a lap
.pass:
        mov     [di+116], ax
        mov     [di+87], ax
        mov     [di+58], ax
        mov     [di+29], ax
        mov     [di+0], ax
        mov     [di-29], ax
        mov     [di-58], ax
        mov     [di-87], ax
        mov     [di-116], ax
        mov     [si+116], ax
        mov     [si+87], ax
        mov     [si+58], ax
        mov     [si+29], ax
        mov     [si+0], ax
        mov     [si-29], ax
        mov     [si-58], ax
        mov     [si-87], ax
        mov     [si-116], ax
        mov     [bx+116], ax
        mov     [bx+87], ax
        mov     [bx+58], ax
        mov     [bx+29], ax
        mov     [bx+0], ax
        mov     [bx-29], ax
        mov     [bx-58], ax
        mov     [bx-87], ax
        mov     [bx-116], ax
        sub     di, PTRS * 9 * S5
        sub     si, PTRS * 9 * S5
        sub     bx, PTRS * 9 * S5
        loop    .next
        jmp     .lap
.next:  jmp     .pass
.dr:    dw      0                       ; data: the drift of the last lap

end:
