; Wraith bombs one lap of the core and then walks off as a large imp that goes on bombing.
; The lap walks up from over our end, 32 DAT words 6 bytes apart for each jump, so a bomber that
; walks down toward us is met before its bombs get here.
; Then the walker, 90 steps of 12 bytes, copies itself 1,080 bytes on with movsw, one step at a time,
; and runs into the copy as an imp does. Each step also drops a bomb on each of two lines, 24,000 and
; 48,000 bytes ahead of it, and the lines sweep the core as it walks.
; It moves 12 bytes for each 8 turns, faster than an imp, so an imp that the lap missed cannot catch
; it from behind, and a bomb that lands on the copy it left behind does no harm.
; The walker is what makes it a heavyweight: it is 1,080 of its 1,226 bytes and every step runs, and
; the lap is 122 more bytes of code that runs.
; vs imp.asm, seeds 1..20: 16 W / 4 T / 0 L
; vs dwarf.asm, seeds 1..20: 20 W / 0 T / 0 L

%name     "Wraith"
%author   "ASM Bots"
%strategy "Bomb one lap, then walk off as a large imp that bombs"

STRIDE  equ     6                       ; bytes between bombs of the lap
ROW     equ     32                      ; bombs in a pass of the lap
PASS    equ     ROW * STRIDE            ; bytes a pass covers
SIZE    equ     end - start
LAP     equ     (0x10000 - SIZE - 2 * PASS) / PASS ; passes in the lap: it stops short of our base
LINE1   equ     24000                   ; bx: the first line of the walker bombs this far ahead
LINE2   equ     48000                   ; bp: the second line bombs this far ahead
LENGTH  equ     end - walk              ; bytes in the walker: it copies itself this far on

; Setup: the base idiom puts our base address in bx, and ax = 0 is the bomb.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        xor     ax, ax

; Lap: one lap of the core, up from over our end, ROW bombs a pass. It walks up because a
; bomber that walks down toward us is met before its bombs get here.
lap:    lea     di, [bx+SIZE]
        mov     cx, LAP
.pass:
        mov     [di+0*STRIDE], ax
        mov     [di+1*STRIDE], ax
        mov     [di+2*STRIDE], ax
        mov     [di+3*STRIDE], ax
        mov     [di+4*STRIDE], ax
        mov     [di+5*STRIDE], ax
        mov     [di+6*STRIDE], ax
        mov     [di+7*STRIDE], ax
        mov     [di+8*STRIDE], ax
        mov     [di+9*STRIDE], ax
        mov     [di+10*STRIDE], ax
        mov     [di+11*STRIDE], ax
        mov     [di+12*STRIDE], ax
        mov     [di+13*STRIDE], ax
        mov     [di+14*STRIDE], ax
        mov     [di+15*STRIDE], ax
        mov     [di+16*STRIDE], ax
        mov     [di+17*STRIDE], ax
        mov     [di+18*STRIDE], ax
        mov     [di+19*STRIDE], ax
        mov     [di+20*STRIDE], ax
        mov     [di+21*STRIDE], ax
        mov     [di+22*STRIDE], ax
        mov     [di+23*STRIDE], ax
        mov     [di+24*STRIDE], ax
        mov     [di+25*STRIDE], ax
        mov     [di+26*STRIDE], ax
        mov     [di+27*STRIDE], ax
        mov     [di+28*STRIDE], ax
        mov     [di+29*STRIDE], ax
        mov     [di+30*STRIDE], ax
        mov     [di+31*STRIDE], ax
        add     di, PASS
        loop    .next
        jmp     go
.next:  jmp     .pass

; Go: aim the walker at the next LENGTH bytes, and set the two lines.
go:     lea     si, [bx+walk]
        lea     di, [si+LENGTH]
        mov     bx, LINE1
        mov     bp, LINE2
        cld

; Walk: 90 steps of 12 bytes. Each copies itself LENGTH bytes on with six movsw, then drops a
; bomb on each line. The last step runs into the copy of the first, so the walker moves on as an
; imp does, 12 bytes for each 8 turns, and each step bombs its own place on the lines.
walk:
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-6], ax
        mov     [bp+di-10], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-4], ax
        mov     [bp+di-6], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-10], ax
        mov     [bp+di-8], ax
        movsw
        movsw
        movsw
        movsw
        movsw
        movsw
        mov     [bx+di-8], ax
        mov     [bp+di-4], ax

end:
