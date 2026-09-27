; Mortar is a dwarf whose bomb is a trap of two words: spl $ (60 FE), then a jmp back to it (EB FC).
; A process that runs into a trap splits into it until its bot is at the process cap, and then
; all of those processes spin there and do no work.
; Mortar lays traps 12 bytes apart for one lap, and on the next lap it writes DAT over the spl
; word of each trap, which kills every process that the trap holds at once.
; A plain DAT kills one process of a paper and the copies make new ones, but a trap holds each
; process that runs into it until the kill lap comes: with DAT in place of the traps, the same
; bot loses to twins in 19 rounds of 20.
; Each trap lap starts 4 bytes lower than the last, so three trap laps cover every byte.
; The pass is what makes it a middleweight: 114 traps unrolled through di, bp, and si for one
; jump are 804 of its 859 bytes, and they run on every lap.
; vs imp.asm, seeds 1..20: 17 W / 3 T / 0 L
; vs dwarf.asm, seeds 1..20: 17 W / 0 T / 3 L

%name     "Mortar"
%author   "ASM Bots"
%strategy "Trap bombs on one lap, DAT on the same spots the next"

STRIDE  equ     12                      ; bytes from one trap to the next
PER     equ     38                      ; traps a pointer drops in a pass
REACH   equ     PER / 2 * STRIDE        ; a pointer bombs from REACH - STRIDE over it to REACH under it
PASS    equ     3 * 2 * REACH           ; bytes a pass covers
SIZE    equ     end - start
LAP     equ     (0x10000 - SIZE - 4 - DRIFTS) / PASS ; passes in a lap: the last trap lands past the body
DRIFT   equ     4                       ; each trap lap starts this much lower than the last
DRIFTS  equ     8                       ; and after this much, it starts at the top again
SPLIT   equ     0xFE60                  ; 60 FE: spl $, a child on this word
LOOPW   equ     0xFCEB                  ; EB FC: jmp $ - 2, back to the spl

; Setup: the base idiom puts our base address in bx; ax and dx start as zero, so lap 1 arms.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        xor     ax, ax
        mov     sp, -DRIFT

; Lap: swap between the trap (ax, dx = spl $, jmp back) and the kill (ax = dx = 0).
lap:    test    ax, ax
        jz      .arm
        xor     ax, ax
        xor     dx, dx
        jmp     .go
.arm:   mov     ax, SPLIT
        mov     dx, LOOPW
        add     sp, DRIFT
        cmp     sp, DRIFTS
        jbe     .go
        xor     sp, sp
.go:    lea     di, [bx-REACH-4]
        sub     di, sp
        lea     bp, [di-2*REACH]
        lea     si, [bp-2*REACH]
        mov     cx, LAP

; Pass: 114 traps, two words each, then one step down and one jump.
pass:
        mov     [di+216], ax
        mov     [di+218], dx
        mov     [di+204], ax
        mov     [di+206], dx
        mov     [di+192], ax
        mov     [di+194], dx
        mov     [di+180], ax
        mov     [di+182], dx
        mov     [di+168], ax
        mov     [di+170], dx
        mov     [di+156], ax
        mov     [di+158], dx
        mov     [di+144], ax
        mov     [di+146], dx
        mov     [di+132], ax
        mov     [di+134], dx
        mov     [di+120], ax
        mov     [di+122], dx
        mov     [di+108], ax
        mov     [di+110], dx
        mov     [di+96], ax
        mov     [di+98], dx
        mov     [di+84], ax
        mov     [di+86], dx
        mov     [di+72], ax
        mov     [di+74], dx
        mov     [di+60], ax
        mov     [di+62], dx
        mov     [di+48], ax
        mov     [di+50], dx
        mov     [di+36], ax
        mov     [di+38], dx
        mov     [di+24], ax
        mov     [di+26], dx
        mov     [di+12], ax
        mov     [di+14], dx
        mov     [di+0], ax
        mov     [di+2], dx
        mov     [di-12], ax
        mov     [di-10], dx
        mov     [di-24], ax
        mov     [di-22], dx
        mov     [di-36], ax
        mov     [di-34], dx
        mov     [di-48], ax
        mov     [di-46], dx
        mov     [di-60], ax
        mov     [di-58], dx
        mov     [di-72], ax
        mov     [di-70], dx
        mov     [di-84], ax
        mov     [di-82], dx
        mov     [di-96], ax
        mov     [di-94], dx
        mov     [di-108], ax
        mov     [di-106], dx
        mov     [di-120], ax
        mov     [di-118], dx
        mov     [di-132], ax
        mov     [di-130], dx
        mov     [di-144], ax
        mov     [di-142], dx
        mov     [di-156], ax
        mov     [di-154], dx
        mov     [di-168], ax
        mov     [di-166], dx
        mov     [di-180], ax
        mov     [di-178], dx
        mov     [di-192], ax
        mov     [di-190], dx
        mov     [di-204], ax
        mov     [di-202], dx
        mov     [di-216], ax
        mov     [di-214], dx
        mov     [di-228], ax
        mov     [di-226], dx
        mov     [bp+216], ax
        mov     [bp+218], dx
        mov     [bp+204], ax
        mov     [bp+206], dx
        mov     [bp+192], ax
        mov     [bp+194], dx
        mov     [bp+180], ax
        mov     [bp+182], dx
        mov     [bp+168], ax
        mov     [bp+170], dx
        mov     [bp+156], ax
        mov     [bp+158], dx
        mov     [bp+144], ax
        mov     [bp+146], dx
        mov     [bp+132], ax
        mov     [bp+134], dx
        mov     [bp+120], ax
        mov     [bp+122], dx
        mov     [bp+108], ax
        mov     [bp+110], dx
        mov     [bp+96], ax
        mov     [bp+98], dx
        mov     [bp+84], ax
        mov     [bp+86], dx
        mov     [bp+72], ax
        mov     [bp+74], dx
        mov     [bp+60], ax
        mov     [bp+62], dx
        mov     [bp+48], ax
        mov     [bp+50], dx
        mov     [bp+36], ax
        mov     [bp+38], dx
        mov     [bp+24], ax
        mov     [bp+26], dx
        mov     [bp+12], ax
        mov     [bp+14], dx
        mov     [bp+0], ax
        mov     [bp+2], dx
        mov     [bp-12], ax
        mov     [bp-10], dx
        mov     [bp-24], ax
        mov     [bp-22], dx
        mov     [bp-36], ax
        mov     [bp-34], dx
        mov     [bp-48], ax
        mov     [bp-46], dx
        mov     [bp-60], ax
        mov     [bp-58], dx
        mov     [bp-72], ax
        mov     [bp-70], dx
        mov     [bp-84], ax
        mov     [bp-82], dx
        mov     [bp-96], ax
        mov     [bp-94], dx
        mov     [bp-108], ax
        mov     [bp-106], dx
        mov     [bp-120], ax
        mov     [bp-118], dx
        mov     [bp-132], ax
        mov     [bp-130], dx
        mov     [bp-144], ax
        mov     [bp-142], dx
        mov     [bp-156], ax
        mov     [bp-154], dx
        mov     [bp-168], ax
        mov     [bp-166], dx
        mov     [bp-180], ax
        mov     [bp-178], dx
        mov     [bp-192], ax
        mov     [bp-190], dx
        mov     [bp-204], ax
        mov     [bp-202], dx
        mov     [bp-216], ax
        mov     [bp-214], dx
        mov     [bp-228], ax
        mov     [bp-226], dx
        mov     [si+216], ax
        mov     [si+218], dx
        mov     [si+204], ax
        mov     [si+206], dx
        mov     [si+192], ax
        mov     [si+194], dx
        mov     [si+180], ax
        mov     [si+182], dx
        mov     [si+168], ax
        mov     [si+170], dx
        mov     [si+156], ax
        mov     [si+158], dx
        mov     [si+144], ax
        mov     [si+146], dx
        mov     [si+132], ax
        mov     [si+134], dx
        mov     [si+120], ax
        mov     [si+122], dx
        mov     [si+108], ax
        mov     [si+110], dx
        mov     [si+96], ax
        mov     [si+98], dx
        mov     [si+84], ax
        mov     [si+86], dx
        mov     [si+72], ax
        mov     [si+74], dx
        mov     [si+60], ax
        mov     [si+62], dx
        mov     [si+48], ax
        mov     [si+50], dx
        mov     [si+36], ax
        mov     [si+38], dx
        mov     [si+24], ax
        mov     [si+26], dx
        mov     [si+12], ax
        mov     [si+14], dx
        mov     [si+0], ax
        mov     [si+2], dx
        mov     [si-12], ax
        mov     [si-10], dx
        mov     [si-24], ax
        mov     [si-22], dx
        mov     [si-36], ax
        mov     [si-34], dx
        mov     [si-48], ax
        mov     [si-46], dx
        mov     [si-60], ax
        mov     [si-58], dx
        mov     [si-72], ax
        mov     [si-70], dx
        mov     [si-84], ax
        mov     [si-82], dx
        mov     [si-96], ax
        mov     [si-94], dx
        mov     [si-108], ax
        mov     [si-106], dx
        mov     [si-120], ax
        mov     [si-118], dx
        mov     [si-132], ax
        mov     [si-130], dx
        mov     [si-144], ax
        mov     [si-142], dx
        mov     [si-156], ax
        mov     [si-154], dx
        mov     [si-168], ax
        mov     [si-166], dx
        mov     [si-180], ax
        mov     [si-178], dx
        mov     [si-192], ax
        mov     [si-190], dx
        mov     [si-204], ax
        mov     [si-202], dx
        mov     [si-216], ax
        mov     [si-214], dx
        mov     [si-228], ax
        mov     [si-226], dx
        sub     di, PASS
        sub     bp, PASS
        sub     si, PASS
        loop    .next
        jmp     lap
.next:  jmp     pass

end:
