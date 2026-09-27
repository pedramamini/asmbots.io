; Juggernaut is a dwarf with two bomb fronts: one walks down from under its body and one walks up
; from over it, and each turn of its loop drops a DAT word on one front or the other.
; A pass drops 128 bombs 64 bytes apart on each front for one jump, 256 bombs in 260 turns, and the
; two fronts meet on the far side of the core after 4 passes: that is one lap.
; Each lap starts both fronts 38 bytes farther out, modulo 64, so the first laps are a coarse net
; that a big bot cannot slip through, and after 32 laps every even byte has had a bomb.
; A rival on either side meets the nearer front first, so a bomber that walks toward us is hit on
; its way.
; The unrolled pass is what makes it a heavyweight: its bombs are 1,017 of its 1,064 bytes, and
; every one of them runs.
; vs imp.asm, seeds 1..20: 17 W / 3 T / 0 L
; vs dwarf.asm, seeds 1..20: 18 W / 0 T / 2 L

%name     "Juggernaut"
%author   "ASM Bots"
%strategy "Two bomb fronts, one up and one down, a bomb a cycle"

STRIDE  equ     64                      ; bytes between bombs on a front
BOMBS   equ     128                     ; bombs a front drops in a pass
SPAN    equ     BOMBS * STRIDE          ; bytes a front moves in a pass
DRIFT   equ     38                      ; bytes the next lap starts farther out
GAP     equ     8                       ; the fronts start this far from the body
SIZE    equ     end - start
LAP     equ     (0x10000 - SIZE - 2 * GAP) / (2 * SPAN) + 1 ; passes until the fronts meet

; Setup: the base idiom puts our base address in bx; ax = 0 is the bomb, dx the drift of a lap.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        xor     ax, ax
        xor     dx, dx

; Lap: di starts the down front under the body and si the up front over it, both dx farther out.
lap:    lea     di, [bx-GAP]
        sub     di, dx
        lea     si, [bx+SIZE+GAP]
        add     si, dx
        mov     cx, LAP

; Pass: one bomb down and one bomb up, BOMBS times, then both fronts move on and one jump.
pass:
        mov     [di], ax
        mov     [si], ax
        mov     [di-64], ax
        mov     [si+64], ax
        mov     [di-128], ax
        mov     [si+128], ax
        mov     [di-192], ax
        mov     [si+192], ax
        mov     [di-256], ax
        mov     [si+256], ax
        mov     [di-320], ax
        mov     [si+320], ax
        mov     [di-384], ax
        mov     [si+384], ax
        mov     [di-448], ax
        mov     [si+448], ax
        mov     [di-512], ax
        mov     [si+512], ax
        mov     [di-576], ax
        mov     [si+576], ax
        mov     [di-640], ax
        mov     [si+640], ax
        mov     [di-704], ax
        mov     [si+704], ax
        mov     [di-768], ax
        mov     [si+768], ax
        mov     [di-832], ax
        mov     [si+832], ax
        mov     [di-896], ax
        mov     [si+896], ax
        mov     [di-960], ax
        mov     [si+960], ax
        mov     [di-1024], ax
        mov     [si+1024], ax
        mov     [di-1088], ax
        mov     [si+1088], ax
        mov     [di-1152], ax
        mov     [si+1152], ax
        mov     [di-1216], ax
        mov     [si+1216], ax
        mov     [di-1280], ax
        mov     [si+1280], ax
        mov     [di-1344], ax
        mov     [si+1344], ax
        mov     [di-1408], ax
        mov     [si+1408], ax
        mov     [di-1472], ax
        mov     [si+1472], ax
        mov     [di-1536], ax
        mov     [si+1536], ax
        mov     [di-1600], ax
        mov     [si+1600], ax
        mov     [di-1664], ax
        mov     [si+1664], ax
        mov     [di-1728], ax
        mov     [si+1728], ax
        mov     [di-1792], ax
        mov     [si+1792], ax
        mov     [di-1856], ax
        mov     [si+1856], ax
        mov     [di-1920], ax
        mov     [si+1920], ax
        mov     [di-1984], ax
        mov     [si+1984], ax
        mov     [di-2048], ax
        mov     [si+2048], ax
        mov     [di-2112], ax
        mov     [si+2112], ax
        mov     [di-2176], ax
        mov     [si+2176], ax
        mov     [di-2240], ax
        mov     [si+2240], ax
        mov     [di-2304], ax
        mov     [si+2304], ax
        mov     [di-2368], ax
        mov     [si+2368], ax
        mov     [di-2432], ax
        mov     [si+2432], ax
        mov     [di-2496], ax
        mov     [si+2496], ax
        mov     [di-2560], ax
        mov     [si+2560], ax
        mov     [di-2624], ax
        mov     [si+2624], ax
        mov     [di-2688], ax
        mov     [si+2688], ax
        mov     [di-2752], ax
        mov     [si+2752], ax
        mov     [di-2816], ax
        mov     [si+2816], ax
        mov     [di-2880], ax
        mov     [si+2880], ax
        mov     [di-2944], ax
        mov     [si+2944], ax
        mov     [di-3008], ax
        mov     [si+3008], ax
        mov     [di-3072], ax
        mov     [si+3072], ax
        mov     [di-3136], ax
        mov     [si+3136], ax
        mov     [di-3200], ax
        mov     [si+3200], ax
        mov     [di-3264], ax
        mov     [si+3264], ax
        mov     [di-3328], ax
        mov     [si+3328], ax
        mov     [di-3392], ax
        mov     [si+3392], ax
        mov     [di-3456], ax
        mov     [si+3456], ax
        mov     [di-3520], ax
        mov     [si+3520], ax
        mov     [di-3584], ax
        mov     [si+3584], ax
        mov     [di-3648], ax
        mov     [si+3648], ax
        mov     [di-3712], ax
        mov     [si+3712], ax
        mov     [di-3776], ax
        mov     [si+3776], ax
        mov     [di-3840], ax
        mov     [si+3840], ax
        mov     [di-3904], ax
        mov     [si+3904], ax
        mov     [di-3968], ax
        mov     [si+3968], ax
        mov     [di-4032], ax
        mov     [si+4032], ax
        mov     [di-4096], ax
        mov     [si+4096], ax
        mov     [di-4160], ax
        mov     [si+4160], ax
        mov     [di-4224], ax
        mov     [si+4224], ax
        mov     [di-4288], ax
        mov     [si+4288], ax
        mov     [di-4352], ax
        mov     [si+4352], ax
        mov     [di-4416], ax
        mov     [si+4416], ax
        mov     [di-4480], ax
        mov     [si+4480], ax
        mov     [di-4544], ax
        mov     [si+4544], ax
        mov     [di-4608], ax
        mov     [si+4608], ax
        mov     [di-4672], ax
        mov     [si+4672], ax
        mov     [di-4736], ax
        mov     [si+4736], ax
        mov     [di-4800], ax
        mov     [si+4800], ax
        mov     [di-4864], ax
        mov     [si+4864], ax
        mov     [di-4928], ax
        mov     [si+4928], ax
        mov     [di-4992], ax
        mov     [si+4992], ax
        mov     [di-5056], ax
        mov     [si+5056], ax
        mov     [di-5120], ax
        mov     [si+5120], ax
        mov     [di-5184], ax
        mov     [si+5184], ax
        mov     [di-5248], ax
        mov     [si+5248], ax
        mov     [di-5312], ax
        mov     [si+5312], ax
        mov     [di-5376], ax
        mov     [si+5376], ax
        mov     [di-5440], ax
        mov     [si+5440], ax
        mov     [di-5504], ax
        mov     [si+5504], ax
        mov     [di-5568], ax
        mov     [si+5568], ax
        mov     [di-5632], ax
        mov     [si+5632], ax
        mov     [di-5696], ax
        mov     [si+5696], ax
        mov     [di-5760], ax
        mov     [si+5760], ax
        mov     [di-5824], ax
        mov     [si+5824], ax
        mov     [di-5888], ax
        mov     [si+5888], ax
        mov     [di-5952], ax
        mov     [si+5952], ax
        mov     [di-6016], ax
        mov     [si+6016], ax
        mov     [di-6080], ax
        mov     [si+6080], ax
        mov     [di-6144], ax
        mov     [si+6144], ax
        mov     [di-6208], ax
        mov     [si+6208], ax
        mov     [di-6272], ax
        mov     [si+6272], ax
        mov     [di-6336], ax
        mov     [si+6336], ax
        mov     [di-6400], ax
        mov     [si+6400], ax
        mov     [di-6464], ax
        mov     [si+6464], ax
        mov     [di-6528], ax
        mov     [si+6528], ax
        mov     [di-6592], ax
        mov     [si+6592], ax
        mov     [di-6656], ax
        mov     [si+6656], ax
        mov     [di-6720], ax
        mov     [si+6720], ax
        mov     [di-6784], ax
        mov     [si+6784], ax
        mov     [di-6848], ax
        mov     [si+6848], ax
        mov     [di-6912], ax
        mov     [si+6912], ax
        mov     [di-6976], ax
        mov     [si+6976], ax
        mov     [di-7040], ax
        mov     [si+7040], ax
        mov     [di-7104], ax
        mov     [si+7104], ax
        mov     [di-7168], ax
        mov     [si+7168], ax
        mov     [di-7232], ax
        mov     [si+7232], ax
        mov     [di-7296], ax
        mov     [si+7296], ax
        mov     [di-7360], ax
        mov     [si+7360], ax
        mov     [di-7424], ax
        mov     [si+7424], ax
        mov     [di-7488], ax
        mov     [si+7488], ax
        mov     [di-7552], ax
        mov     [si+7552], ax
        mov     [di-7616], ax
        mov     [si+7616], ax
        mov     [di-7680], ax
        mov     [si+7680], ax
        mov     [di-7744], ax
        mov     [si+7744], ax
        mov     [di-7808], ax
        mov     [si+7808], ax
        mov     [di-7872], ax
        mov     [si+7872], ax
        mov     [di-7936], ax
        mov     [si+7936], ax
        mov     [di-8000], ax
        mov     [si+8000], ax
        mov     [di-8064], ax
        mov     [si+8064], ax
        mov     [di-8128], ax
        mov     [si+8128], ax
        sub     di, SPAN
        add     si, SPAN
        loop    .next
        add     dx, DRIFT               ; the next lap starts farther out
        and     dx, STRIDE - 1          ; modulo the stride
        jmp     lap
.next:  jmp     pass

end:
