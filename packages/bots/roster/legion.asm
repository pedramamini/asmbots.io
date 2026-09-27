; Legion writes 12 imps (movsw, nop) around the core, one every 5,461 bytes, and starts a process
; on each. Then it forks 48 bombers, one for each 1,344-byte lane under its body.
; A bomber drops 84 DAT words, 16 bytes apart, down its lane, and each lap of a lane starts 2 bytes
; lower than the last, so the lanes put a bomb on every word of the core.
; A rival must kill 60 processes in 60 places to win, so Legion lasts: it ties paper where other
; bombers lose to it, and it lives through a crowd.
; After each pass a bomber reads a wire word 6,000 bytes under the body, where an imp that walks up
; the core leaves its trail. A bomber that sees the trail holds a gate for a while: it decrements a
; word 16 bytes under the body, and with most of Legion's turns on the gate, the imp dies there.
; The unrolled launcher and pass are what make it a middleweight: they are 484 of its 587 bytes,
; and every one of them runs.
; vs imp.asm, seeds 1..20: 20 W / 0 T / 0 L
; vs dwarf.asm, seeds 1..20: 17 W / 2 T / 1 L

%name     "Legion"
%author   "ASM Bots"
%strategy "Twelve imps around the core, and 48 bombers that gate the next imp"

IMPS    equ     12                      ; imps in the legion
APART   equ     0x10000 / IMPS          ; bytes between two imps
PAIR    equ     0x90A5                  ; movsw (A5) then nop (90), as a little-endian word
WIRE    equ     6000                    ; the wire word is this far under the base
GATE    equ     16                      ; the gate word is this far under the base
HOLD    equ     40                      ; rounds of 8 gate turns a bomber holds
LANES   equ     48                      ; bomber processes, one lane each
STRIDE  equ     16                      ; bytes between bombs
BOMBS   equ     84                      ; bombs in a pass
PASS    equ     BOMBS * STRIDE          ; bytes a pass covers
SIZE    equ     end - start
PASSES  equ     (0x10000 - SIZE - STRIDE) / LANES / PASS ; passes in a lane
LANE    equ     PASSES * PASS           ; bytes in a lane

; Setup: the base idiom puts our base address in bx, and ax = 0 is the bomb. dx, the lap shift, is 0 at load.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        xor     ax, ax

; Launch: write each imp, aim its copy at the next word, and start a process on it. Each imp is
; 2 bytes further on than an even split, so the imps do not meet the bomb pattern in step.
launch:
        lea     si, [bx+SIZE+0*APART+0]
        mov     word [si], PAIR
        lea     di, [si+2]
        spl     si
        lea     si, [bx+SIZE+1*APART+2]
        mov     word [si], PAIR
        lea     di, [si+2]
        spl     si
        lea     si, [bx+SIZE+2*APART+4]
        mov     word [si], PAIR
        lea     di, [si+2]
        spl     si
        lea     si, [bx+SIZE+3*APART+6]
        mov     word [si], PAIR
        lea     di, [si+2]
        spl     si
        lea     si, [bx+SIZE+4*APART+8]
        mov     word [si], PAIR
        lea     di, [si+2]
        spl     si
        lea     si, [bx+SIZE+5*APART+10]
        mov     word [si], PAIR
        lea     di, [si+2]
        spl     si
        lea     si, [bx+SIZE+6*APART+12]
        mov     word [si], PAIR
        lea     di, [si+2]
        spl     si
        lea     si, [bx+SIZE+7*APART+14]
        mov     word [si], PAIR
        lea     di, [si+2]
        spl     si
        lea     si, [bx+SIZE+8*APART+16]
        mov     word [si], PAIR
        lea     di, [si+2]
        spl     si
        lea     si, [bx+SIZE+9*APART+18]
        mov     word [si], PAIR
        lea     di, [si+2]
        spl     si
        lea     si, [bx+SIZE+10*APART+20]
        mov     word [si], PAIR
        lea     di, [si+2]
        spl     si
        lea     si, [bx+SIZE+11*APART+22]
        mov     word [si], PAIR
        lea     di, [si+2]
        spl     si

; Fork: start a bomber on each lane; bp is the top of a lane.
fork:   mov     bp, bx
        mov     cx, LANES - 1
.fork:  spl     lap
        sub     bp, LANE
        loop    .fork

; Lap: each lap starts at the top of the lane, 2 bytes lower than the last.
lap:    mov     di, bp
        sub     di, dx
        add     dx, 2
        and     dx, STRIDE - 1
        mov     cx, PASSES

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
        sub     di, PASS
        cmp     word [bx-WIRE], PAIR    ; an imp on the wire, at either parity
        je      close
        cmp     word [bx-WIRE-1], PAIR
        je      close
.count: loop    .next
        jmp     lap
.next:  jmp     pass

; Close: an imp walks toward our body. Each bomber that sees it holds the gate for a while.
close:  mov     si, HOLD
.gate:  times   8 dec word [bx-GATE]
        dec     si
        jnz     .gate
        mov     [bx-WIRE-2], ax         ; clear the wire, and bomb on
        mov     [bx-WIRE], ax
        jmp     pass.count

end:
