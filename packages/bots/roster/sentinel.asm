; Sentinel is a bomber that starts an imp gate only when it needs one. A pass drops 126 DAT words,
; 16 bytes apart, for one jump, and each lap starts 2 bytes lower than the last, so the first lap
; finds a big rival fast and eight laps put a bomb on every word of the core.
; After each pass it reads a wire word 512 bytes under its body. The wire stays zero until
; something walks over it, and an imp walks up the core, so it crosses the wire before it gets to
; the body.
; Then Sentinel starts a gate that decrements a word 16 bytes under the body on eight turns in
; nine, and the imp dies at the gate. Until then the bomber has every turn, and a lap takes about
; 4,200 turns.
; The unrolled pass is what makes it a middleweight: its 126 bombs are 496 of its 577 bytes, and
; every one of them runs.
; vs imp.asm, seeds 1..20: 20 W / 0 T / 0 L
; vs dwarf.asm, seeds 1..20: 19 W / 0 T / 1 L

%name     "Sentinel"
%author   "ASM Bots"
%strategy "A wide bomber that starts an imp gate when its wire trips"

WIRE    equ     512                     ; the wire word is this far under the base
GATE    equ     16                      ; the gate word is this far under the base
STRIDE  equ     16                      ; bytes between bombs
BOMBS   equ     126                     ; bombs in a pass
PASS    equ     BOMBS * STRIDE          ; bytes a pass covers
SIZE    equ     end - start
LAP     equ     (0x10000 - SIZE - STRIDE) / PASS ; passes in a lap: the last bomb lands past the body

; Setup: the base idiom puts our base address in bx, ax = 0 is the bomb, and dx is the lap shift.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        xor     ax, ax
        xor     dx, dx

; Lap: each lap starts under our base, 2 bytes lower than the last, so the laps fill the gaps.
lap:    mov     di, bx
        sub     di, dx
        add     dx, 2
        and     dx, STRIDE - 1
        mov     cx, LAP

; Pass: BOMBS bombs down from di, then one step down, a look at the wire, and one jump.
pass:
        mov     [di-1*STRIDE], ax
        mov     [di-2*STRIDE], ax
        mov     [di-3*STRIDE], ax
        mov     [di-4*STRIDE], ax
        mov     [di-5*STRIDE], ax
        mov     [di-6*STRIDE], ax
        mov     [di-7*STRIDE], ax
        mov     [di-8*STRIDE], ax
        mov     [di-9*STRIDE], ax
        mov     [di-10*STRIDE], ax
        mov     [di-11*STRIDE], ax
        mov     [di-12*STRIDE], ax
        mov     [di-13*STRIDE], ax
        mov     [di-14*STRIDE], ax
        mov     [di-15*STRIDE], ax
        mov     [di-16*STRIDE], ax
        mov     [di-17*STRIDE], ax
        mov     [di-18*STRIDE], ax
        mov     [di-19*STRIDE], ax
        mov     [di-20*STRIDE], ax
        mov     [di-21*STRIDE], ax
        mov     [di-22*STRIDE], ax
        mov     [di-23*STRIDE], ax
        mov     [di-24*STRIDE], ax
        mov     [di-25*STRIDE], ax
        mov     [di-26*STRIDE], ax
        mov     [di-27*STRIDE], ax
        mov     [di-28*STRIDE], ax
        mov     [di-29*STRIDE], ax
        mov     [di-30*STRIDE], ax
        mov     [di-31*STRIDE], ax
        mov     [di-32*STRIDE], ax
        mov     [di-33*STRIDE], ax
        mov     [di-34*STRIDE], ax
        mov     [di-35*STRIDE], ax
        mov     [di-36*STRIDE], ax
        mov     [di-37*STRIDE], ax
        mov     [di-38*STRIDE], ax
        mov     [di-39*STRIDE], ax
        mov     [di-40*STRIDE], ax
        mov     [di-41*STRIDE], ax
        mov     [di-42*STRIDE], ax
        mov     [di-43*STRIDE], ax
        mov     [di-44*STRIDE], ax
        mov     [di-45*STRIDE], ax
        mov     [di-46*STRIDE], ax
        mov     [di-47*STRIDE], ax
        mov     [di-48*STRIDE], ax
        mov     [di-49*STRIDE], ax
        mov     [di-50*STRIDE], ax
        mov     [di-51*STRIDE], ax
        mov     [di-52*STRIDE], ax
        mov     [di-53*STRIDE], ax
        mov     [di-54*STRIDE], ax
        mov     [di-55*STRIDE], ax
        mov     [di-56*STRIDE], ax
        mov     [di-57*STRIDE], ax
        mov     [di-58*STRIDE], ax
        mov     [di-59*STRIDE], ax
        mov     [di-60*STRIDE], ax
        mov     [di-61*STRIDE], ax
        mov     [di-62*STRIDE], ax
        mov     [di-63*STRIDE], ax
        mov     [di-64*STRIDE], ax
        mov     [di-65*STRIDE], ax
        mov     [di-66*STRIDE], ax
        mov     [di-67*STRIDE], ax
        mov     [di-68*STRIDE], ax
        mov     [di-69*STRIDE], ax
        mov     [di-70*STRIDE], ax
        mov     [di-71*STRIDE], ax
        mov     [di-72*STRIDE], ax
        mov     [di-73*STRIDE], ax
        mov     [di-74*STRIDE], ax
        mov     [di-75*STRIDE], ax
        mov     [di-76*STRIDE], ax
        mov     [di-77*STRIDE], ax
        mov     [di-78*STRIDE], ax
        mov     [di-79*STRIDE], ax
        mov     [di-80*STRIDE], ax
        mov     [di-81*STRIDE], ax
        mov     [di-82*STRIDE], ax
        mov     [di-83*STRIDE], ax
        mov     [di-84*STRIDE], ax
        mov     [di-85*STRIDE], ax
        mov     [di-86*STRIDE], ax
        mov     [di-87*STRIDE], ax
        mov     [di-88*STRIDE], ax
        mov     [di-89*STRIDE], ax
        mov     [di-90*STRIDE], ax
        mov     [di-91*STRIDE], ax
        mov     [di-92*STRIDE], ax
        mov     [di-93*STRIDE], ax
        mov     [di-94*STRIDE], ax
        mov     [di-95*STRIDE], ax
        mov     [di-96*STRIDE], ax
        mov     [di-97*STRIDE], ax
        mov     [di-98*STRIDE], ax
        mov     [di-99*STRIDE], ax
        mov     [di-100*STRIDE], ax
        mov     [di-101*STRIDE], ax
        mov     [di-102*STRIDE], ax
        mov     [di-103*STRIDE], ax
        mov     [di-104*STRIDE], ax
        mov     [di-105*STRIDE], ax
        mov     [di-106*STRIDE], ax
        mov     [di-107*STRIDE], ax
        mov     [di-108*STRIDE], ax
        mov     [di-109*STRIDE], ax
        mov     [di-110*STRIDE], ax
        mov     [di-111*STRIDE], ax
        mov     [di-112*STRIDE], ax
        mov     [di-113*STRIDE], ax
        mov     [di-114*STRIDE], ax
        mov     [di-115*STRIDE], ax
        mov     [di-116*STRIDE], ax
        mov     [di-117*STRIDE], ax
        mov     [di-118*STRIDE], ax
        mov     [di-119*STRIDE], ax
        mov     [di-120*STRIDE], ax
        mov     [di-121*STRIDE], ax
        mov     [di-122*STRIDE], ax
        mov     [di-123*STRIDE], ax
        mov     [di-124*STRIDE], ax
        mov     [di-125*STRIDE], ax
        mov     [di-126*STRIDE], ax
        sub     di, PASS
        cmp     [bx-WIRE], ax           ; the wire is zero until something walks over it
        jne     arm
.count: loop    .next
        jmp     lap
.next:  jmp     pass

; Arm: clear the wire, and the first time, start the gate. si is 0 at load, and 1 once the gate runs.
arm:    mov     [bx-WIRE], ax
        test    si, si
        jnz     pass.count
        inc     si
        spl     gate
        jmp     pass.count

; Gate: decrement the gate word on eight turns in nine, forever.
gate:   times   8 dec word [bx-GATE]
        jmp     gate

end:
