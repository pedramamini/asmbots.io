; Hive is 24 small papers, its cells, side by side in one body, and it runs one process in each.
; A cell copies itself with rep movsw to a place along its path, starts a process in the copy
; with spl, drops 20 DAT words 10 bytes apart around the point halfway to the next place, and goes
; on; each copy does the same from its own base with the two bytes swapped.
; Each cell has a step of its own, 518 bytes longer than the last, so the 24 paths cross the
; core in 24 patterns, and a copy of 90 bytes is ready in 45 turns.
; A bomb that lands on one cell breaks that cell only, and the process cap fills in the first
; turns of the battle, so a rival has to kill copies faster than 64 processes make them.
; The cells are what make Hive a super-heavy: they are 2,160 of its 2,179 bytes, and all 24 run.
; vs imp.asm, seeds 1..20: 20 W / 0 T / 0 L
; vs dwarf.asm, seeds 1..20: 20 W / 0 T / 0 L

%name     "Hive"
%author   "ASM Bots"
%strategy "24 small papers in one body, each with a step of its own"

CELLS   equ     24                      ; cells in the hive
STEP    equ     0x2468                  ; bytes from one copy of cell 0 to the next along its path
SKEW    equ     0x0206                  ; each cell's step is SKEW bytes longer than the last cell's
CELL    equ     c1 - c0                 ; bytes in a cell
WORDS   equ     CELL / 2                ; words in a cell

; Launch: the base idiom puts cell 0's base in bx. Start cells 0 to 22, each child with bx on its
; own cell, and run cell 23.
start:  call    .here
.here:  pop     bx
        sub     bx, .here - c0
        mov     cx, CELLS - 1
.go:    spl     bx
        add     bx, CELL
        loop    .go
        jmp     bx

; Cell 0: bx is its base. Copy the cell STEP bytes along the path, start the copy with its bx on
; it, and bomb around the point halfway to the next copy. The other cells are the same but for
; their step.
c0:     mov     dx, bx
        xchg    dl, dh                  ; our base, bytes swapped: far from the parent's path
.copy:  add     dx, STEP
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx                  ; the child starts with bx on its copy
        spl     bx
        xchg    bx, dx
        lea     di, [di+STEP/2]
        xor     ax, ax                  ; ax = 0 is the bomb
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 1: a step of STEP + 1 * SKEW.
c1:     mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 1 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+1*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 2: a step of STEP + 2 * SKEW.
c2:     mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 2 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+2*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 3: a step of STEP + 3 * SKEW.
c3:     mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 3 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+3*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 4: a step of STEP + 4 * SKEW.
c4:     mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 4 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+4*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 5: a step of STEP + 5 * SKEW.
c5:     mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 5 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+5*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 6: a step of STEP + 6 * SKEW.
c6:     mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 6 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+6*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 7: a step of STEP + 7 * SKEW.
c7:     mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 7 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+7*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 8: a step of STEP + 8 * SKEW.
c8:     mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 8 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+8*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 9: a step of STEP + 9 * SKEW.
c9:     mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 9 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+9*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 10: a step of STEP + 10 * SKEW.
c10:    mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 10 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+10*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 11: a step of STEP + 11 * SKEW.
c11:    mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 11 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+11*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 12: a step of STEP + 12 * SKEW.
c12:    mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 12 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+12*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 13: a step of STEP + 13 * SKEW.
c13:    mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 13 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+13*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 14: a step of STEP + 14 * SKEW.
c14:    mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 14 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+14*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 15: a step of STEP + 15 * SKEW.
c15:    mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 15 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+15*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 16: a step of STEP + 16 * SKEW.
c16:    mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 16 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+16*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 17: a step of STEP + 17 * SKEW.
c17:    mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 17 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+17*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 18: a step of STEP + 18 * SKEW.
c18:    mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 18 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+18*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 19: a step of STEP + 19 * SKEW.
c19:    mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 19 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+19*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 20: a step of STEP + 20 * SKEW.
c20:    mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 20 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+20*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 21: a step of STEP + 21 * SKEW.
c21:    mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 21 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+21*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 22: a step of STEP + 22 * SKEW.
c22:    mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 22 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+22*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

; Cell 23: a step of STEP + 23 * SKEW.
c23:    mov     dx, bx
        xchg    dl, dh
.copy:  add     dx, STEP + 23 * SKEW
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xchg    bx, dx
        spl     bx
        xchg    bx, dx
        lea     di, [di+(STEP+23*SKEW)/2]
        xor     ax, ax
        mov     [di-100], ax
        mov     [di-90], ax
        mov     [di-80], ax
        mov     [di-70], ax
        mov     [di-60], ax
        mov     [di-50], ax
        mov     [di-40], ax
        mov     [di-30], ax
        mov     [di-20], ax
        mov     [di-10], ax
        mov     [di+0], ax
        mov     [di+10], ax
        mov     [di+20], ax
        mov     [di+30], ax
        mov     [di+40], ax
        mov     [di+50], ax
        mov     [di+60], ax
        mov     [di+70], ax
        mov     [di+80], ax
        mov     [di+90], ax
        jmp     .copy

end:
