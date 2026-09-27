; Quarry runs four bombers at once, one process each, and each one walks down the core with a
; stride of its own: 4, 10, 26, and 64 bytes.
; Each bomber is a dwarf loop unrolled to 32 to 64 DAT words a pass for one jump, so the bot
; drops almost one bomb a cycle, and the four share it.
; The stride-64 bomber laps the core in about 1,100 of its turns and gets to a rival early, the
; strides of 26 and 10 break smaller code, and the stride-4 bomber leaves no instruction of 3
; bytes or more whole.
; A bomb or a fang that kills one bomber leaves three that go on, and they get its turns.
; The four bombers are what make it a middleweight: they are 705 of its 723 bytes, and all four run.
; vs imp.asm, seeds 1..20: 19 W / 1 T / 0 L
; vs dwarf.asm, seeds 1..20: 15 W / 0 T / 5 L

%name     "Quarry"
%author   "ASM Bots"
%strategy "Four unrolled bombers, four strides, four processes"

S1      equ     4                       ; bytes between bombs of bomber 1
N1      equ     64                      ; bombs in a pass of bomber 1
S2      equ     10                      ; bytes between bombs of bomber 2
N2      equ     48                      ; bombs in a pass of bomber 2
S3      equ     26                      ; bytes between bombs of bomber 3
N3      equ     40                      ; bombs in a pass of bomber 3
S4      equ     64                      ; bytes between bombs of bomber 4
N4      equ     32                      ; bombs in a pass of bomber 4
SIZE    equ     end - start
PASS1   equ     N1 * S1                 ; bytes a pass of bomber 1 covers
LAP1    equ     (0x10000 - SIZE) / PASS1 ; passes in a lap of bomber 1: the last bomb lands past the body
PASS2   equ     N2 * S2                 ; bytes a pass of bomber 2 covers
LAP2    equ     (0x10000 - SIZE) / PASS2 ; passes in a lap of bomber 2: the last bomb lands past the body
PASS3   equ     N3 * S3                 ; bytes a pass of bomber 3 covers
LAP3    equ     (0x10000 - SIZE) / PASS3 ; passes in a lap of bomber 3: the last bomb lands past the body
PASS4   equ     N4 * S4                 ; bytes a pass of bomber 4 covers
LAP4    equ     (0x10000 - SIZE) / PASS4 ; passes in a lap of bomber 4: the last bomb lands past the body

; Setup: the base idiom puts our base address in bx, and ax = 0 is the bomb.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        xor     ax, ax

; Launch: start a process on each other bomber; this process goes on as bomber 1.
launch:
        spl     b2
        spl     b3
        spl     b4

; Bomber 1: each lap starts under our base and walks down, 64 bombs 4 bytes apart a pass.
b1:     lea     di, [bx-N1/2*S1]
        mov     cx, LAP1
.pass:
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
        sub     di, PASS1
        loop    .next
        jmp     b1
.next:  jmp     .pass

; Bomber 2: each lap starts under our base and walks down, 48 bombs 10 bytes apart a pass.
b2:     lea     di, [bx-N2/2*S2]
        mov     cx, LAP2
.pass:
        mov     [di+230], ax
        mov     [di+220], ax
        mov     [di+210], ax
        mov     [di+200], ax
        mov     [di+190], ax
        mov     [di+180], ax
        mov     [di+170], ax
        mov     [di+160], ax
        mov     [di+150], ax
        mov     [di+140], ax
        mov     [di+130], ax
        mov     [di+120], ax
        mov     [di+110], ax
        mov     [di+100], ax
        mov     [di+90], ax
        mov     [di+80], ax
        mov     [di+70], ax
        mov     [di+60], ax
        mov     [di+50], ax
        mov     [di+40], ax
        mov     [di+30], ax
        mov     [di+20], ax
        mov     [di+10], ax
        mov     [di+0], ax
        mov     [di-10], ax
        mov     [di-20], ax
        mov     [di-30], ax
        mov     [di-40], ax
        mov     [di-50], ax
        mov     [di-60], ax
        mov     [di-70], ax
        mov     [di-80], ax
        mov     [di-90], ax
        mov     [di-100], ax
        mov     [di-110], ax
        mov     [di-120], ax
        mov     [di-130], ax
        mov     [di-140], ax
        mov     [di-150], ax
        mov     [di-160], ax
        mov     [di-170], ax
        mov     [di-180], ax
        mov     [di-190], ax
        mov     [di-200], ax
        mov     [di-210], ax
        mov     [di-220], ax
        mov     [di-230], ax
        mov     [di-240], ax
        sub     di, PASS2
        loop    .next
        jmp     b2
.next:  jmp     .pass

; Bomber 3: each lap starts under our base and walks down, 40 bombs 26 bytes apart a pass.
b3:     lea     di, [bx-N3/2*S3]
        mov     cx, LAP3
.pass:
        mov     [di+494], ax
        mov     [di+468], ax
        mov     [di+442], ax
        mov     [di+416], ax
        mov     [di+390], ax
        mov     [di+364], ax
        mov     [di+338], ax
        mov     [di+312], ax
        mov     [di+286], ax
        mov     [di+260], ax
        mov     [di+234], ax
        mov     [di+208], ax
        mov     [di+182], ax
        mov     [di+156], ax
        mov     [di+130], ax
        mov     [di+104], ax
        mov     [di+78], ax
        mov     [di+52], ax
        mov     [di+26], ax
        mov     [di+0], ax
        mov     [di-26], ax
        mov     [di-52], ax
        mov     [di-78], ax
        mov     [di-104], ax
        mov     [di-130], ax
        mov     [di-156], ax
        mov     [di-182], ax
        mov     [di-208], ax
        mov     [di-234], ax
        mov     [di-260], ax
        mov     [di-286], ax
        mov     [di-312], ax
        mov     [di-338], ax
        mov     [di-364], ax
        mov     [di-390], ax
        mov     [di-416], ax
        mov     [di-442], ax
        mov     [di-468], ax
        mov     [di-494], ax
        mov     [di-520], ax
        sub     di, PASS3
        loop    .next
        jmp     b3
.next:  jmp     .pass

; Bomber 4: each lap starts under our base and walks down, 32 bombs 64 bytes apart a pass.
b4:     lea     di, [bx-N4/2*S4]
        mov     cx, LAP4
.pass:
        mov     [di+960], ax
        mov     [di+896], ax
        mov     [di+832], ax
        mov     [di+768], ax
        mov     [di+704], ax
        mov     [di+640], ax
        mov     [di+576], ax
        mov     [di+512], ax
        mov     [di+448], ax
        mov     [di+384], ax
        mov     [di+320], ax
        mov     [di+256], ax
        mov     [di+192], ax
        mov     [di+128], ax
        mov     [di+64], ax
        mov     [di+0], ax
        mov     [di-64], ax
        mov     [di-128], ax
        mov     [di-192], ax
        mov     [di-256], ax
        mov     [di-320], ax
        mov     [di-384], ax
        mov     [di-448], ax
        mov     [di-512], ax
        mov     [di-576], ax
        mov     [di-640], ax
        mov     [di-704], ax
        mov     [di-768], ax
        mov     [di-832], ax
        mov     [di-896], ax
        mov     [di-960], ax
        mov     [di-1024], ax
        sub     di, PASS4
        loop    .next
        jmp     b4
.next:  jmp     .pass

end:
