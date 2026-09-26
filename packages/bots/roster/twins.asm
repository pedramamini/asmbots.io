; Twins is paper that carries two bombing loops and runs one of them in each copy: a parent
; flips a side byte in each copy it makes, so a copy runs the other loop from its parent's.
; Between two copies a process bombs around the point halfway to its next copy: the dense side
; drops 64 DAT words 4 bytes apart over 256 bytes, and the wide side 72 words 32 bytes apart
; over 2 KB.
; The two unrolled loops are what make it a middleweight: they are 477 of its 524 bytes, and
; every one of them runs.
; The dense bursts break every instruction they cover, and the wide bursts reach bots that sit
; far from any midpoint, so a rival that dodges one pattern still meets the other.
; vs imp.asm, seeds 1..20: 19 W / 1 T / 0 L
; vs dwarf.asm, seeds 1..20: 18 W / 2 T / 0 L

%name     "Twins"
%author   "ASM Bots"
%strategy "Paper whose copies take turns: a dense burst, then a wide one"

STEP    equ     0x1234                  ; bytes from one copy to the next along a path
SIZE    equ     end - start
WORDS   equ     (SIZE + 1) / 2          ; words in a copy

; Setup: the base idiom puts our base address in bx, and dx starts the path.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        mov     dx, bx
        xchg    dl, dh                  ; our base, bytes swapped: far from the parent's path

; Copy: write the body STEP bytes on, flip its side, start it, and bomb on our own side.
copy:   add     dx, STEP
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        xor     byte [di+side-2*WORDS], 1
        spl     dx
        lea     di, [di+STEP/2-2*WORDS] ; halfway to the next copy
        xor     ax, ax                  ; ax = 0 is the bomb
        test    byte [bx+side], 1
        jz      dense
        jmp     wide

; Dense: 64 bombs over the 256 bytes around di.
dense:
        mov     [di+124], ax
        mov     [di+120], ax
        mov     [di+116], ax
        mov     [di+112], ax
        mov     [di+108], ax
        mov     [di+104], ax
        mov     [di+100], ax
        mov     [di+96], ax
        mov     [di+92], ax
        mov     [di+88], ax
        mov     [di+84], ax
        mov     [di+80], ax
        mov     [di+76], ax
        mov     [di+72], ax
        mov     [di+68], ax
        mov     [di+64], ax
        mov     [di+60], ax
        mov     [di+56], ax
        mov     [di+52], ax
        mov     [di+48], ax
        mov     [di+44], ax
        mov     [di+40], ax
        mov     [di+36], ax
        mov     [di+32], ax
        mov     [di+28], ax
        mov     [di+24], ax
        mov     [di+20], ax
        mov     [di+16], ax
        mov     [di+12], ax
        mov     [di+8], ax
        mov     [di+4], ax
        mov     [di+0], ax
        mov     [di-4], ax
        mov     [di-8], ax
        mov     [di-12], ax
        mov     [di-16], ax
        mov     [di-20], ax
        mov     [di-24], ax
        mov     [di-28], ax
        mov     [di-32], ax
        mov     [di-36], ax
        mov     [di-40], ax
        mov     [di-44], ax
        mov     [di-48], ax
        mov     [di-52], ax
        mov     [di-56], ax
        mov     [di-60], ax
        mov     [di-64], ax
        mov     [di-68], ax
        mov     [di-72], ax
        mov     [di-76], ax
        mov     [di-80], ax
        mov     [di-84], ax
        mov     [di-88], ax
        mov     [di-92], ax
        mov     [di-96], ax
        mov     [di-100], ax
        mov     [di-104], ax
        mov     [di-108], ax
        mov     [di-112], ax
        mov     [di-116], ax
        mov     [di-120], ax
        mov     [di-124], ax
        mov     [di-128], ax
        jmp     copy

; Wide: 72 bombs over the 2 KB around di.
wide:
        mov     [di+1136], ax
        mov     [di+1104], ax
        mov     [di+1072], ax
        mov     [di+1040], ax
        mov     [di+1008], ax
        mov     [di+976], ax
        mov     [di+944], ax
        mov     [di+912], ax
        mov     [di+880], ax
        mov     [di+848], ax
        mov     [di+816], ax
        mov     [di+784], ax
        mov     [di+752], ax
        mov     [di+720], ax
        mov     [di+688], ax
        mov     [di+656], ax
        mov     [di+624], ax
        mov     [di+592], ax
        mov     [di+560], ax
        mov     [di+528], ax
        mov     [di+496], ax
        mov     [di+464], ax
        mov     [di+432], ax
        mov     [di+400], ax
        mov     [di+368], ax
        mov     [di+336], ax
        mov     [di+304], ax
        mov     [di+272], ax
        mov     [di+240], ax
        mov     [di+208], ax
        mov     [di+176], ax
        mov     [di+144], ax
        mov     [di+112], ax
        mov     [di+80], ax
        mov     [di+48], ax
        mov     [di+16], ax
        mov     [di-16], ax
        mov     [di-48], ax
        mov     [di-80], ax
        mov     [di-112], ax
        mov     [di-144], ax
        mov     [di-176], ax
        mov     [di-208], ax
        mov     [di-240], ax
        mov     [di-272], ax
        mov     [di-304], ax
        mov     [di-336], ax
        mov     [di-368], ax
        mov     [di-400], ax
        mov     [di-432], ax
        mov     [di-464], ax
        mov     [di-496], ax
        mov     [di-528], ax
        mov     [di-560], ax
        mov     [di-592], ax
        mov     [di-624], ax
        mov     [di-656], ax
        mov     [di-688], ax
        mov     [di-720], ax
        mov     [di-752], ax
        mov     [di-784], ax
        mov     [di-816], ax
        mov     [di-848], ax
        mov     [di-880], ax
        mov     [di-912], ax
        mov     [di-944], ax
        mov     [di-976], ax
        mov     [di-1008], ax
        mov     [di-1040], ax
        mov     [di-1072], ax
        mov     [di-1104], ax
        mov     [di-1136], ax
        jmp     copy

; Data: which loop this copy runs, 0 dense or 1 wide.
side:   db      0

end:
