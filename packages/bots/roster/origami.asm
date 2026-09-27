; Origami is paper in two folds: the live fold runs, and the spare fold holds the same bytes.
; Each process writes the whole body 0x1234 bytes along its path with rep movsw, starts the copy
; with spl, and drops a burst of 64 DAT words, 32 bytes apart, around the point halfway to the
; next copy.
; A new copy checks itself before it copies, and again after each 8 copies: repe cmpsw compares the
; two folds, and where they differ, a zero byte in the live fold means that a bomb hit it, so the
; spare mends it; else the live fold mends the spare.
; A bomb that hits a parent between two checks is copied into its children, but each child mends
; it from its own spare before it makes a copy.
; The two folds are what make it a middleweight: the live fold (339 bytes) runs, and each check
; reads all 339 bytes of the spare.
; vs imp.asm, seeds 1..20: 15 W / 5 T / 0 L
; vs dwarf.asm, seeds 1..20: 15 W / 5 T / 0 L

%name     "Origami"
%author   "ASM Bots"
%strategy "Paper that mends itself from a spare fold"

STEP    equ     0x1234                  ; bytes from one copy to the next along a path
CHECKS  equ     8                       ; copies between two checks
BSTRIDE equ     32                      ; bytes between the bombs of a burst
PANEL   equ     fold1 - start           ; bytes in a fold
PWORDS  equ     PANEL / 2               ; words in a fold
SIZE    equ     end - start
WORDS   equ     SIZE / 2                ; words in a copy

; Setup: the base idiom puts our base address in bx, and dx starts the path.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        mov     dx, bx
        xchg    dl, dh                  ; our base, bytes swapped: far from the parent's path

; Check: compare the live fold with the spare, and mend each word where they differ.
check:  cld
        lea     si, [bx+start]
        lea     di, [bx+fold1]
        mov     cx, PWORDS
.cmp:   repe    cmpsw                   ; stops one word past a word that differs
        je      .done                   ; the rest of the folds match
        mov     ax, [si-2]              ; the live word
        cmp     al, [di-2]
        jne     .byte                   ; the low byte differs
        mov     al, ah                  ; else the high byte does
.byte:  test    al, al
        jnz     .spare                  ; not zero: the live fold is right, so mend the spare
        mov     ax, [di-2]
        mov     [si-2], ax              ; zero: a bomb hit the live fold, so mend it
        jmp     .next
.spare: mov     ax, [si-2]
        mov     [di-2], ax
.next:  jcxz    .done
        jmp     .cmp
.done:  mov     bp, CHECKS              ; copies before the next check

; Copy: write the whole body STEP bytes on and start it.
copy:   add     dx, STEP
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        spl     dx

; Burst: 64 bombs, BSTRIDE bytes apart, around the point halfway to the next copy.
burst:  mov     di, dx
        add     di, STEP / 2            ; halfway to the next copy
        xor     ax, ax                  ; ax = 0 is the bomb
        mov     [di-32*BSTRIDE], ax
        mov     [di-31*BSTRIDE], ax
        mov     [di-30*BSTRIDE], ax
        mov     [di-29*BSTRIDE], ax
        mov     [di-28*BSTRIDE], ax
        mov     [di-27*BSTRIDE], ax
        mov     [di-26*BSTRIDE], ax
        mov     [di-25*BSTRIDE], ax
        mov     [di-24*BSTRIDE], ax
        mov     [di-23*BSTRIDE], ax
        mov     [di-22*BSTRIDE], ax
        mov     [di-21*BSTRIDE], ax
        mov     [di-20*BSTRIDE], ax
        mov     [di-19*BSTRIDE], ax
        mov     [di-18*BSTRIDE], ax
        mov     [di-17*BSTRIDE], ax
        mov     [di-16*BSTRIDE], ax
        mov     [di-15*BSTRIDE], ax
        mov     [di-14*BSTRIDE], ax
        mov     [di-13*BSTRIDE], ax
        mov     [di-12*BSTRIDE], ax
        mov     [di-11*BSTRIDE], ax
        mov     [di-10*BSTRIDE], ax
        mov     [di-9*BSTRIDE], ax
        mov     [di-8*BSTRIDE], ax
        mov     [di-7*BSTRIDE], ax
        mov     [di-6*BSTRIDE], ax
        mov     [di-5*BSTRIDE], ax
        mov     [di-4*BSTRIDE], ax
        mov     [di-3*BSTRIDE], ax
        mov     [di-2*BSTRIDE], ax
        mov     [di-1*BSTRIDE], ax
        mov     [di], ax
        mov     [di+1*BSTRIDE], ax
        mov     [di+2*BSTRIDE], ax
        mov     [di+3*BSTRIDE], ax
        mov     [di+4*BSTRIDE], ax
        mov     [di+5*BSTRIDE], ax
        mov     [di+6*BSTRIDE], ax
        mov     [di+7*BSTRIDE], ax
        mov     [di+8*BSTRIDE], ax
        mov     [di+9*BSTRIDE], ax
        mov     [di+10*BSTRIDE], ax
        mov     [di+11*BSTRIDE], ax
        mov     [di+12*BSTRIDE], ax
        mov     [di+13*BSTRIDE], ax
        mov     [di+14*BSTRIDE], ax
        mov     [di+15*BSTRIDE], ax
        mov     [di+16*BSTRIDE], ax
        mov     [di+17*BSTRIDE], ax
        mov     [di+18*BSTRIDE], ax
        mov     [di+19*BSTRIDE], ax
        mov     [di+20*BSTRIDE], ax
        mov     [di+21*BSTRIDE], ax
        mov     [di+22*BSTRIDE], ax
        mov     [di+23*BSTRIDE], ax
        mov     [di+24*BSTRIDE], ax
        mov     [di+25*BSTRIDE], ax
        mov     [di+26*BSTRIDE], ax
        mov     [di+27*BSTRIDE], ax
        mov     [di+28*BSTRIDE], ax
        mov     [di+29*BSTRIDE], ax
        mov     [di+30*BSTRIDE], ax
        mov     [di+31*BSTRIDE], ax
        dec     bp
        jz      .again                  ; CHECKS copies made: check again
        jmp     copy
.again: jmp     check

; Spare: the second fold, the same bytes as the first. It never runs: the check reads it.
fold1:  call    .here
.here:  pop     bx
        sub     bx, start.here
        mov     dx, bx
        xchg    dl, dh

check_p: cld
        lea     si, [bx+start]
        lea     di, [bx+fold1]
        mov     cx, PWORDS
.cmp:   repe    cmpsw
        je      .done
        mov     ax, [si-2]
        cmp     al, [di-2]
        jne     .byte
        mov     al, ah
.byte:  test    al, al
        jnz     .spare
        mov     ax, [di-2]
        mov     [si-2], ax
        jmp     .next
.spare: mov     ax, [si-2]
        mov     [di-2], ax
.next:  jcxz    .done
        jmp     .cmp
.done:  mov     bp, CHECKS

copy_p: add     dx, STEP
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        spl     dx

burst_p: mov    di, dx
        add     di, STEP / 2
        xor     ax, ax
        mov     [di-32*BSTRIDE], ax
        mov     [di-31*BSTRIDE], ax
        mov     [di-30*BSTRIDE], ax
        mov     [di-29*BSTRIDE], ax
        mov     [di-28*BSTRIDE], ax
        mov     [di-27*BSTRIDE], ax
        mov     [di-26*BSTRIDE], ax
        mov     [di-25*BSTRIDE], ax
        mov     [di-24*BSTRIDE], ax
        mov     [di-23*BSTRIDE], ax
        mov     [di-22*BSTRIDE], ax
        mov     [di-21*BSTRIDE], ax
        mov     [di-20*BSTRIDE], ax
        mov     [di-19*BSTRIDE], ax
        mov     [di-18*BSTRIDE], ax
        mov     [di-17*BSTRIDE], ax
        mov     [di-16*BSTRIDE], ax
        mov     [di-15*BSTRIDE], ax
        mov     [di-14*BSTRIDE], ax
        mov     [di-13*BSTRIDE], ax
        mov     [di-12*BSTRIDE], ax
        mov     [di-11*BSTRIDE], ax
        mov     [di-10*BSTRIDE], ax
        mov     [di-9*BSTRIDE], ax
        mov     [di-8*BSTRIDE], ax
        mov     [di-7*BSTRIDE], ax
        mov     [di-6*BSTRIDE], ax
        mov     [di-5*BSTRIDE], ax
        mov     [di-4*BSTRIDE], ax
        mov     [di-3*BSTRIDE], ax
        mov     [di-2*BSTRIDE], ax
        mov     [di-1*BSTRIDE], ax
        mov     [di], ax
        mov     [di+1*BSTRIDE], ax
        mov     [di+2*BSTRIDE], ax
        mov     [di+3*BSTRIDE], ax
        mov     [di+4*BSTRIDE], ax
        mov     [di+5*BSTRIDE], ax
        mov     [di+6*BSTRIDE], ax
        mov     [di+7*BSTRIDE], ax
        mov     [di+8*BSTRIDE], ax
        mov     [di+9*BSTRIDE], ax
        mov     [di+10*BSTRIDE], ax
        mov     [di+11*BSTRIDE], ax
        mov     [di+12*BSTRIDE], ax
        mov     [di+13*BSTRIDE], ax
        mov     [di+14*BSTRIDE], ax
        mov     [di+15*BSTRIDE], ax
        mov     [di+16*BSTRIDE], ax
        mov     [di+17*BSTRIDE], ax
        mov     [di+18*BSTRIDE], ax
        mov     [di+19*BSTRIDE], ax
        mov     [di+20*BSTRIDE], ax
        mov     [di+21*BSTRIDE], ax
        mov     [di+22*BSTRIDE], ax
        mov     [di+23*BSTRIDE], ax
        mov     [di+24*BSTRIDE], ax
        mov     [di+25*BSTRIDE], ax
        mov     [di+26*BSTRIDE], ax
        mov     [di+27*BSTRIDE], ax
        mov     [di+28*BSTRIDE], ax
        mov     [di+29*BSTRIDE], ax
        mov     [di+30*BSTRIDE], ax
        mov     [di+31*BSTRIDE], ax
        dec     bp
        jz      .again
        jmp     copy_p
.again: jmp     check_p

end:
