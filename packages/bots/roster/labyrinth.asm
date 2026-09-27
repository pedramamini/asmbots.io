; Labyrinth is paper with a big body: each copy carries a field of 256 DAT bombs, 64 bytes apart,
; and drops it over the 16 KB above itself each time it makes a copy.
; A process copies the body STEP bytes along its path with rep movsw, starts the copy with spl,
; bombs its field for one jump, and goes on to the next place; each copy starts its own path at its
; base with the two bytes swapped, so the copies and their fields spread over the whole core.
; A big body is a slow copy, 528 turns, but each copy writes 1 KB of paper over what it lands on,
; and each one pays its way with a field that reaches a quarter of the core, at an offset of its own.
; The field is what makes it a heavyweight: its bombs are 1,021 of its 1,056 bytes, and every one of
; them runs, in every copy.
; vs imp.asm, seeds 1..20: 18 W / 1 T / 1 L
; vs dwarf.asm, seeds 1..20: 15 W / 3 T / 2 L

%name     "Labyrinth"
%author   "ASM Bots"
%strategy "Paper whose big copies bomb a wide field between copies"

STEP    equ     0x1234                  ; bytes from one copy to the next along a path
GAP     equ     8                       ; the field starts this far over the body
SIZE    equ     end - start
WORDS   equ     (SIZE + 1) / 2          ; words in a copy

; Setup: the base idiom puts our base address in bx, and dx starts the path.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        mov     dx, bx
        xchg    dl, dh                  ; our base, bytes swapped: far from the parent's path

; Copy: write the body STEP bytes on, start a process there, and aim the field over our body.
copy:   add     dx, STEP
        mov     si, bx
        mov     di, dx
        mov     cx, WORDS
        rep     movsw
        spl     dx
        lea     di, [bx+SIZE+GAP]
        xor     ax, ax

; Bomb: 256 bombs 64 bytes apart, from GAP bytes over the body up, then the next copy.
bomb:
        mov     [di], ax
        mov     [di+64], ax
        mov     [di+128], ax
        mov     [di+192], ax
        mov     [di+256], ax
        mov     [di+320], ax
        mov     [di+384], ax
        mov     [di+448], ax
        mov     [di+512], ax
        mov     [di+576], ax
        mov     [di+640], ax
        mov     [di+704], ax
        mov     [di+768], ax
        mov     [di+832], ax
        mov     [di+896], ax
        mov     [di+960], ax
        mov     [di+1024], ax
        mov     [di+1088], ax
        mov     [di+1152], ax
        mov     [di+1216], ax
        mov     [di+1280], ax
        mov     [di+1344], ax
        mov     [di+1408], ax
        mov     [di+1472], ax
        mov     [di+1536], ax
        mov     [di+1600], ax
        mov     [di+1664], ax
        mov     [di+1728], ax
        mov     [di+1792], ax
        mov     [di+1856], ax
        mov     [di+1920], ax
        mov     [di+1984], ax
        mov     [di+2048], ax
        mov     [di+2112], ax
        mov     [di+2176], ax
        mov     [di+2240], ax
        mov     [di+2304], ax
        mov     [di+2368], ax
        mov     [di+2432], ax
        mov     [di+2496], ax
        mov     [di+2560], ax
        mov     [di+2624], ax
        mov     [di+2688], ax
        mov     [di+2752], ax
        mov     [di+2816], ax
        mov     [di+2880], ax
        mov     [di+2944], ax
        mov     [di+3008], ax
        mov     [di+3072], ax
        mov     [di+3136], ax
        mov     [di+3200], ax
        mov     [di+3264], ax
        mov     [di+3328], ax
        mov     [di+3392], ax
        mov     [di+3456], ax
        mov     [di+3520], ax
        mov     [di+3584], ax
        mov     [di+3648], ax
        mov     [di+3712], ax
        mov     [di+3776], ax
        mov     [di+3840], ax
        mov     [di+3904], ax
        mov     [di+3968], ax
        mov     [di+4032], ax
        mov     [di+4096], ax
        mov     [di+4160], ax
        mov     [di+4224], ax
        mov     [di+4288], ax
        mov     [di+4352], ax
        mov     [di+4416], ax
        mov     [di+4480], ax
        mov     [di+4544], ax
        mov     [di+4608], ax
        mov     [di+4672], ax
        mov     [di+4736], ax
        mov     [di+4800], ax
        mov     [di+4864], ax
        mov     [di+4928], ax
        mov     [di+4992], ax
        mov     [di+5056], ax
        mov     [di+5120], ax
        mov     [di+5184], ax
        mov     [di+5248], ax
        mov     [di+5312], ax
        mov     [di+5376], ax
        mov     [di+5440], ax
        mov     [di+5504], ax
        mov     [di+5568], ax
        mov     [di+5632], ax
        mov     [di+5696], ax
        mov     [di+5760], ax
        mov     [di+5824], ax
        mov     [di+5888], ax
        mov     [di+5952], ax
        mov     [di+6016], ax
        mov     [di+6080], ax
        mov     [di+6144], ax
        mov     [di+6208], ax
        mov     [di+6272], ax
        mov     [di+6336], ax
        mov     [di+6400], ax
        mov     [di+6464], ax
        mov     [di+6528], ax
        mov     [di+6592], ax
        mov     [di+6656], ax
        mov     [di+6720], ax
        mov     [di+6784], ax
        mov     [di+6848], ax
        mov     [di+6912], ax
        mov     [di+6976], ax
        mov     [di+7040], ax
        mov     [di+7104], ax
        mov     [di+7168], ax
        mov     [di+7232], ax
        mov     [di+7296], ax
        mov     [di+7360], ax
        mov     [di+7424], ax
        mov     [di+7488], ax
        mov     [di+7552], ax
        mov     [di+7616], ax
        mov     [di+7680], ax
        mov     [di+7744], ax
        mov     [di+7808], ax
        mov     [di+7872], ax
        mov     [di+7936], ax
        mov     [di+8000], ax
        mov     [di+8064], ax
        mov     [di+8128], ax
        mov     [di+8192], ax
        mov     [di+8256], ax
        mov     [di+8320], ax
        mov     [di+8384], ax
        mov     [di+8448], ax
        mov     [di+8512], ax
        mov     [di+8576], ax
        mov     [di+8640], ax
        mov     [di+8704], ax
        mov     [di+8768], ax
        mov     [di+8832], ax
        mov     [di+8896], ax
        mov     [di+8960], ax
        mov     [di+9024], ax
        mov     [di+9088], ax
        mov     [di+9152], ax
        mov     [di+9216], ax
        mov     [di+9280], ax
        mov     [di+9344], ax
        mov     [di+9408], ax
        mov     [di+9472], ax
        mov     [di+9536], ax
        mov     [di+9600], ax
        mov     [di+9664], ax
        mov     [di+9728], ax
        mov     [di+9792], ax
        mov     [di+9856], ax
        mov     [di+9920], ax
        mov     [di+9984], ax
        mov     [di+10048], ax
        mov     [di+10112], ax
        mov     [di+10176], ax
        mov     [di+10240], ax
        mov     [di+10304], ax
        mov     [di+10368], ax
        mov     [di+10432], ax
        mov     [di+10496], ax
        mov     [di+10560], ax
        mov     [di+10624], ax
        mov     [di+10688], ax
        mov     [di+10752], ax
        mov     [di+10816], ax
        mov     [di+10880], ax
        mov     [di+10944], ax
        mov     [di+11008], ax
        mov     [di+11072], ax
        mov     [di+11136], ax
        mov     [di+11200], ax
        mov     [di+11264], ax
        mov     [di+11328], ax
        mov     [di+11392], ax
        mov     [di+11456], ax
        mov     [di+11520], ax
        mov     [di+11584], ax
        mov     [di+11648], ax
        mov     [di+11712], ax
        mov     [di+11776], ax
        mov     [di+11840], ax
        mov     [di+11904], ax
        mov     [di+11968], ax
        mov     [di+12032], ax
        mov     [di+12096], ax
        mov     [di+12160], ax
        mov     [di+12224], ax
        mov     [di+12288], ax
        mov     [di+12352], ax
        mov     [di+12416], ax
        mov     [di+12480], ax
        mov     [di+12544], ax
        mov     [di+12608], ax
        mov     [di+12672], ax
        mov     [di+12736], ax
        mov     [di+12800], ax
        mov     [di+12864], ax
        mov     [di+12928], ax
        mov     [di+12992], ax
        mov     [di+13056], ax
        mov     [di+13120], ax
        mov     [di+13184], ax
        mov     [di+13248], ax
        mov     [di+13312], ax
        mov     [di+13376], ax
        mov     [di+13440], ax
        mov     [di+13504], ax
        mov     [di+13568], ax
        mov     [di+13632], ax
        mov     [di+13696], ax
        mov     [di+13760], ax
        mov     [di+13824], ax
        mov     [di+13888], ax
        mov     [di+13952], ax
        mov     [di+14016], ax
        mov     [di+14080], ax
        mov     [di+14144], ax
        mov     [di+14208], ax
        mov     [di+14272], ax
        mov     [di+14336], ax
        mov     [di+14400], ax
        mov     [di+14464], ax
        mov     [di+14528], ax
        mov     [di+14592], ax
        mov     [di+14656], ax
        mov     [di+14720], ax
        mov     [di+14784], ax
        mov     [di+14848], ax
        mov     [di+14912], ax
        mov     [di+14976], ax
        mov     [di+15040], ax
        mov     [di+15104], ax
        mov     [di+15168], ax
        mov     [di+15232], ax
        mov     [di+15296], ax
        mov     [di+15360], ax
        mov     [di+15424], ax
        mov     [di+15488], ax
        mov     [di+15552], ax
        mov     [di+15616], ax
        mov     [di+15680], ax
        mov     [di+15744], ax
        mov     [di+15808], ax
        mov     [di+15872], ax
        mov     [di+15936], ax
        mov     [di+16000], ax
        mov     [di+16064], ax
        mov     [di+16128], ax
        mov     [di+16192], ax
        mov     [di+16256], ax
        mov     [di+16320], ax
        jmp     copy

end:
