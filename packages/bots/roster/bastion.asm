; Bastion is a dwarf with its bomb loop unrolled 128 times, between two fields of fake code.
; A pass drops 128 DAT words 4 bytes apart, 64 through di and 64 through bp, for one jump, so it
; bombs almost once a cycle and laps the core three times as fast as the dwarf.
; The loop is what makes it a middleweight: 384 of its bytes are bombs that run.
; The fake code, 64 bytes on each side, reads mov ax, [0xa1cc] and then int3: a scanner stops on it
; and carpets it, a fang or a stray bomb that lands on it breaks nothing, and a process that runs
; into it dies.
; vs imp.asm, seeds 1..20: 18 W / 2 T / 0 L
; vs dwarf.asm, seeds 1..20: 16 W / 0 T / 4 L

%name     "Bastion"
%author   "ASM Bots"
%strategy "An unrolled bomber between two fields of fake code"

DECOY   equ     64                      ; bytes of fake code on each side
FILL    equ     0xCCA1                  ; A1 CC: mov ax, [0xa1cc], then int3
STRIDE  equ     4                       ; bytes between bombs
REACH   equ     128                     ; a pointer bombs from REACH - STRIDE over it to REACH under it
PASS    equ     4 * REACH               ; bytes a pass covers: two pointers, 2 * REACH each
SIZE    equ     end - start
LAP     equ     (0x10000 - SIZE) / PASS ; passes in a lap: the last bomb lands past the body

; Setup: step over the low field.
start:  jmp     main

; Low field: fake code under the bomber.
low:    times   DECOY / 2 dw FILL

; Main: the base idiom puts our base address in bx, and ax = 0 is the bomb.
main:   call    .here
.here:  pop     bx
        sub     bx, .here
        xor     ax, ax

; Lap: each lap starts under our base; di bombs the top half of a pass and bp the bottom half.
lap:    lea     di, [bx-REACH]
        lea     bp, [di-2*REACH]
        mov     cx, LAP

; Pass: 128 bombs, then one step down and one jump.
pass:
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
        mov     [bp+124], ax
        mov     [bp+120], ax
        mov     [bp+116], ax
        mov     [bp+112], ax
        mov     [bp+108], ax
        mov     [bp+104], ax
        mov     [bp+100], ax
        mov     [bp+96], ax
        mov     [bp+92], ax
        mov     [bp+88], ax
        mov     [bp+84], ax
        mov     [bp+80], ax
        mov     [bp+76], ax
        mov     [bp+72], ax
        mov     [bp+68], ax
        mov     [bp+64], ax
        mov     [bp+60], ax
        mov     [bp+56], ax
        mov     [bp+52], ax
        mov     [bp+48], ax
        mov     [bp+44], ax
        mov     [bp+40], ax
        mov     [bp+36], ax
        mov     [bp+32], ax
        mov     [bp+28], ax
        mov     [bp+24], ax
        mov     [bp+20], ax
        mov     [bp+16], ax
        mov     [bp+12], ax
        mov     [bp+8], ax
        mov     [bp+4], ax
        mov     [bp+0], ax
        mov     [bp-4], ax
        mov     [bp-8], ax
        mov     [bp-12], ax
        mov     [bp-16], ax
        mov     [bp-20], ax
        mov     [bp-24], ax
        mov     [bp-28], ax
        mov     [bp-32], ax
        mov     [bp-36], ax
        mov     [bp-40], ax
        mov     [bp-44], ax
        mov     [bp-48], ax
        mov     [bp-52], ax
        mov     [bp-56], ax
        mov     [bp-60], ax
        mov     [bp-64], ax
        mov     [bp-68], ax
        mov     [bp-72], ax
        mov     [bp-76], ax
        mov     [bp-80], ax
        mov     [bp-84], ax
        mov     [bp-88], ax
        mov     [bp-92], ax
        mov     [bp-96], ax
        mov     [bp-100], ax
        mov     [bp-104], ax
        mov     [bp-108], ax
        mov     [bp-112], ax
        mov     [bp-116], ax
        mov     [bp-120], ax
        mov     [bp-124], ax
        mov     [bp-128], ax
        sub     di, PASS
        sub     bp, PASS
        loop    .next
        jmp     lap
.next:  jmp     pass

; High field: fake code over the bomber.
high:   times   DECOY / 2 dw FILL

end:
