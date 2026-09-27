; Monolith is a stone of eight bombers, each in a cell of its own, and each cell runs a process.
; Each bomber walks the whole core with its own stride, 72 DAT words for one jump, and each lap
; stops just short of the body. Four go up from the body and four go down from it, and the strides
; are 6, 10, 12, and 14 bytes for the dense ones and 36, 52, 84, and 116 bytes for the wide ones.
; The dense bombers kill a small bot such as a dwarf, which a wide stride can miss. The wide ones
; get round the core fast and break a big bot before its bombs come round to us.
; A bomb on one cell kills that bomber only, and the other seven go on. The eight unrolled cells are
; what make Monolith a super-heavy: they are 2,381 of its 2,411 bytes, and all eight run.
; vs imp.asm, seeds 1..20: 17 W / 1 T / 2 L
; vs dwarf.asm, seeds 1..20: 20 W / 0 T / 0 L

%name     "Monolith"
%author   "ASM Bots"
%strategy "Eight bombers in eight cells, each with its own stride"

SIZE    equ     end - start
BOMBS   equ     72                      ; bombs a cell drops in a pass

S0      equ     12                      ; cell 0: bytes between bombs, up
S1      equ     6                       ; cell 1: bytes between bombs, down
S2      equ     14                      ; cell 2: bytes between bombs, up
S3      equ     10                      ; cell 3: bytes between bombs, down
S4      equ     36                      ; cell 4: bytes between bombs, up
S5      equ     52                      ; cell 5: bytes between bombs, down
S6      equ     84                      ; cell 6: bytes between bombs, up
S7      equ     116                     ; cell 7: bytes between bombs, down

; Setup: the base idiom puts our base address in bx; start cells 1 to 7, and run cell 0.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        xor     ax, ax                  ; ax = 0 is the bomb
        spl     c1
        spl     c2
        spl     c3
        spl     c4
        spl     c5
        spl     c6
        spl     c7

; Cell 0: up, 12 bytes between bombs.
c0:     lea     di, [bx+SIZE]
        mov     cx, (0x10000 - SIZE - 2) / (BOMBS * S0)
.pass:
        mov     [di], ax
        mov     [di+12], ax
        mov     [di+24], ax
        mov     [di+36], ax
        mov     [di+48], ax
        mov     [di+60], ax
        mov     [di+72], ax
        mov     [di+84], ax
        mov     [di+96], ax
        mov     [di+108], ax
        mov     [di+120], ax
        mov     [di+132], ax
        mov     [di+144], ax
        mov     [di+156], ax
        mov     [di+168], ax
        mov     [di+180], ax
        mov     [di+192], ax
        mov     [di+204], ax
        mov     [di+216], ax
        mov     [di+228], ax
        mov     [di+240], ax
        mov     [di+252], ax
        mov     [di+264], ax
        mov     [di+276], ax
        mov     [di+288], ax
        mov     [di+300], ax
        mov     [di+312], ax
        mov     [di+324], ax
        mov     [di+336], ax
        mov     [di+348], ax
        mov     [di+360], ax
        mov     [di+372], ax
        mov     [di+384], ax
        mov     [di+396], ax
        mov     [di+408], ax
        mov     [di+420], ax
        mov     [di+432], ax
        mov     [di+444], ax
        mov     [di+456], ax
        mov     [di+468], ax
        mov     [di+480], ax
        mov     [di+492], ax
        mov     [di+504], ax
        mov     [di+516], ax
        mov     [di+528], ax
        mov     [di+540], ax
        mov     [di+552], ax
        mov     [di+564], ax
        mov     [di+576], ax
        mov     [di+588], ax
        mov     [di+600], ax
        mov     [di+612], ax
        mov     [di+624], ax
        mov     [di+636], ax
        mov     [di+648], ax
        mov     [di+660], ax
        mov     [di+672], ax
        mov     [di+684], ax
        mov     [di+696], ax
        mov     [di+708], ax
        mov     [di+720], ax
        mov     [di+732], ax
        mov     [di+744], ax
        mov     [di+756], ax
        mov     [di+768], ax
        mov     [di+780], ax
        mov     [di+792], ax
        mov     [di+804], ax
        mov     [di+816], ax
        mov     [di+828], ax
        mov     [di+840], ax
        mov     [di+852], ax
        add     di, BOMBS * S0
        loop    .next
        jmp     c0
.next:  jmp     .pass

; Cell 1: down, 6 bytes between bombs.
c1:     mov     di, bx
        mov     cx, (0x10000 - SIZE - 2) / (BOMBS * S1)
.pass:
        mov     [di-6], ax
        mov     [di-12], ax
        mov     [di-18], ax
        mov     [di-24], ax
        mov     [di-30], ax
        mov     [di-36], ax
        mov     [di-42], ax
        mov     [di-48], ax
        mov     [di-54], ax
        mov     [di-60], ax
        mov     [di-66], ax
        mov     [di-72], ax
        mov     [di-78], ax
        mov     [di-84], ax
        mov     [di-90], ax
        mov     [di-96], ax
        mov     [di-102], ax
        mov     [di-108], ax
        mov     [di-114], ax
        mov     [di-120], ax
        mov     [di-126], ax
        mov     [di-132], ax
        mov     [di-138], ax
        mov     [di-144], ax
        mov     [di-150], ax
        mov     [di-156], ax
        mov     [di-162], ax
        mov     [di-168], ax
        mov     [di-174], ax
        mov     [di-180], ax
        mov     [di-186], ax
        mov     [di-192], ax
        mov     [di-198], ax
        mov     [di-204], ax
        mov     [di-210], ax
        mov     [di-216], ax
        mov     [di-222], ax
        mov     [di-228], ax
        mov     [di-234], ax
        mov     [di-240], ax
        mov     [di-246], ax
        mov     [di-252], ax
        mov     [di-258], ax
        mov     [di-264], ax
        mov     [di-270], ax
        mov     [di-276], ax
        mov     [di-282], ax
        mov     [di-288], ax
        mov     [di-294], ax
        mov     [di-300], ax
        mov     [di-306], ax
        mov     [di-312], ax
        mov     [di-318], ax
        mov     [di-324], ax
        mov     [di-330], ax
        mov     [di-336], ax
        mov     [di-342], ax
        mov     [di-348], ax
        mov     [di-354], ax
        mov     [di-360], ax
        mov     [di-366], ax
        mov     [di-372], ax
        mov     [di-378], ax
        mov     [di-384], ax
        mov     [di-390], ax
        mov     [di-396], ax
        mov     [di-402], ax
        mov     [di-408], ax
        mov     [di-414], ax
        mov     [di-420], ax
        mov     [di-426], ax
        mov     [di-432], ax
        sub     di, BOMBS * S1
        loop    .next
        jmp     c1
.next:  jmp     .pass

; Cell 2: up, 14 bytes between bombs.
c2:     lea     di, [bx+SIZE]
        mov     cx, (0x10000 - SIZE - 2) / (BOMBS * S2)
.pass:
        mov     [di], ax
        mov     [di+14], ax
        mov     [di+28], ax
        mov     [di+42], ax
        mov     [di+56], ax
        mov     [di+70], ax
        mov     [di+84], ax
        mov     [di+98], ax
        mov     [di+112], ax
        mov     [di+126], ax
        mov     [di+140], ax
        mov     [di+154], ax
        mov     [di+168], ax
        mov     [di+182], ax
        mov     [di+196], ax
        mov     [di+210], ax
        mov     [di+224], ax
        mov     [di+238], ax
        mov     [di+252], ax
        mov     [di+266], ax
        mov     [di+280], ax
        mov     [di+294], ax
        mov     [di+308], ax
        mov     [di+322], ax
        mov     [di+336], ax
        mov     [di+350], ax
        mov     [di+364], ax
        mov     [di+378], ax
        mov     [di+392], ax
        mov     [di+406], ax
        mov     [di+420], ax
        mov     [di+434], ax
        mov     [di+448], ax
        mov     [di+462], ax
        mov     [di+476], ax
        mov     [di+490], ax
        mov     [di+504], ax
        mov     [di+518], ax
        mov     [di+532], ax
        mov     [di+546], ax
        mov     [di+560], ax
        mov     [di+574], ax
        mov     [di+588], ax
        mov     [di+602], ax
        mov     [di+616], ax
        mov     [di+630], ax
        mov     [di+644], ax
        mov     [di+658], ax
        mov     [di+672], ax
        mov     [di+686], ax
        mov     [di+700], ax
        mov     [di+714], ax
        mov     [di+728], ax
        mov     [di+742], ax
        mov     [di+756], ax
        mov     [di+770], ax
        mov     [di+784], ax
        mov     [di+798], ax
        mov     [di+812], ax
        mov     [di+826], ax
        mov     [di+840], ax
        mov     [di+854], ax
        mov     [di+868], ax
        mov     [di+882], ax
        mov     [di+896], ax
        mov     [di+910], ax
        mov     [di+924], ax
        mov     [di+938], ax
        mov     [di+952], ax
        mov     [di+966], ax
        mov     [di+980], ax
        mov     [di+994], ax
        add     di, BOMBS * S2
        loop    .next
        jmp     c2
.next:  jmp     .pass

; Cell 3: down, 10 bytes between bombs.
c3:     mov     di, bx
        mov     cx, (0x10000 - SIZE - 2) / (BOMBS * S3)
.pass:
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
        mov     [di-250], ax
        mov     [di-260], ax
        mov     [di-270], ax
        mov     [di-280], ax
        mov     [di-290], ax
        mov     [di-300], ax
        mov     [di-310], ax
        mov     [di-320], ax
        mov     [di-330], ax
        mov     [di-340], ax
        mov     [di-350], ax
        mov     [di-360], ax
        mov     [di-370], ax
        mov     [di-380], ax
        mov     [di-390], ax
        mov     [di-400], ax
        mov     [di-410], ax
        mov     [di-420], ax
        mov     [di-430], ax
        mov     [di-440], ax
        mov     [di-450], ax
        mov     [di-460], ax
        mov     [di-470], ax
        mov     [di-480], ax
        mov     [di-490], ax
        mov     [di-500], ax
        mov     [di-510], ax
        mov     [di-520], ax
        mov     [di-530], ax
        mov     [di-540], ax
        mov     [di-550], ax
        mov     [di-560], ax
        mov     [di-570], ax
        mov     [di-580], ax
        mov     [di-590], ax
        mov     [di-600], ax
        mov     [di-610], ax
        mov     [di-620], ax
        mov     [di-630], ax
        mov     [di-640], ax
        mov     [di-650], ax
        mov     [di-660], ax
        mov     [di-670], ax
        mov     [di-680], ax
        mov     [di-690], ax
        mov     [di-700], ax
        mov     [di-710], ax
        mov     [di-720], ax
        sub     di, BOMBS * S3
        loop    .next
        jmp     c3
.next:  jmp     .pass

; Cell 4: up, 36 bytes between bombs.
c4:     lea     di, [bx+SIZE]
        mov     cx, (0x10000 - SIZE - 2) / (BOMBS * S4)
.pass:
        mov     [di], ax
        mov     [di+36], ax
        mov     [di+72], ax
        mov     [di+108], ax
        mov     [di+144], ax
        mov     [di+180], ax
        mov     [di+216], ax
        mov     [di+252], ax
        mov     [di+288], ax
        mov     [di+324], ax
        mov     [di+360], ax
        mov     [di+396], ax
        mov     [di+432], ax
        mov     [di+468], ax
        mov     [di+504], ax
        mov     [di+540], ax
        mov     [di+576], ax
        mov     [di+612], ax
        mov     [di+648], ax
        mov     [di+684], ax
        mov     [di+720], ax
        mov     [di+756], ax
        mov     [di+792], ax
        mov     [di+828], ax
        mov     [di+864], ax
        mov     [di+900], ax
        mov     [di+936], ax
        mov     [di+972], ax
        mov     [di+1008], ax
        mov     [di+1044], ax
        mov     [di+1080], ax
        mov     [di+1116], ax
        mov     [di+1152], ax
        mov     [di+1188], ax
        mov     [di+1224], ax
        mov     [di+1260], ax
        mov     [di+1296], ax
        mov     [di+1332], ax
        mov     [di+1368], ax
        mov     [di+1404], ax
        mov     [di+1440], ax
        mov     [di+1476], ax
        mov     [di+1512], ax
        mov     [di+1548], ax
        mov     [di+1584], ax
        mov     [di+1620], ax
        mov     [di+1656], ax
        mov     [di+1692], ax
        mov     [di+1728], ax
        mov     [di+1764], ax
        mov     [di+1800], ax
        mov     [di+1836], ax
        mov     [di+1872], ax
        mov     [di+1908], ax
        mov     [di+1944], ax
        mov     [di+1980], ax
        mov     [di+2016], ax
        mov     [di+2052], ax
        mov     [di+2088], ax
        mov     [di+2124], ax
        mov     [di+2160], ax
        mov     [di+2196], ax
        mov     [di+2232], ax
        mov     [di+2268], ax
        mov     [di+2304], ax
        mov     [di+2340], ax
        mov     [di+2376], ax
        mov     [di+2412], ax
        mov     [di+2448], ax
        mov     [di+2484], ax
        mov     [di+2520], ax
        mov     [di+2556], ax
        add     di, BOMBS * S4
        loop    .next
        jmp     c4
.next:  jmp     .pass

; Cell 5: down, 52 bytes between bombs.
c5:     mov     di, bx
        mov     cx, (0x10000 - SIZE - 2) / (BOMBS * S5)
.pass:
        mov     [di-52], ax
        mov     [di-104], ax
        mov     [di-156], ax
        mov     [di-208], ax
        mov     [di-260], ax
        mov     [di-312], ax
        mov     [di-364], ax
        mov     [di-416], ax
        mov     [di-468], ax
        mov     [di-520], ax
        mov     [di-572], ax
        mov     [di-624], ax
        mov     [di-676], ax
        mov     [di-728], ax
        mov     [di-780], ax
        mov     [di-832], ax
        mov     [di-884], ax
        mov     [di-936], ax
        mov     [di-988], ax
        mov     [di-1040], ax
        mov     [di-1092], ax
        mov     [di-1144], ax
        mov     [di-1196], ax
        mov     [di-1248], ax
        mov     [di-1300], ax
        mov     [di-1352], ax
        mov     [di-1404], ax
        mov     [di-1456], ax
        mov     [di-1508], ax
        mov     [di-1560], ax
        mov     [di-1612], ax
        mov     [di-1664], ax
        mov     [di-1716], ax
        mov     [di-1768], ax
        mov     [di-1820], ax
        mov     [di-1872], ax
        mov     [di-1924], ax
        mov     [di-1976], ax
        mov     [di-2028], ax
        mov     [di-2080], ax
        mov     [di-2132], ax
        mov     [di-2184], ax
        mov     [di-2236], ax
        mov     [di-2288], ax
        mov     [di-2340], ax
        mov     [di-2392], ax
        mov     [di-2444], ax
        mov     [di-2496], ax
        mov     [di-2548], ax
        mov     [di-2600], ax
        mov     [di-2652], ax
        mov     [di-2704], ax
        mov     [di-2756], ax
        mov     [di-2808], ax
        mov     [di-2860], ax
        mov     [di-2912], ax
        mov     [di-2964], ax
        mov     [di-3016], ax
        mov     [di-3068], ax
        mov     [di-3120], ax
        mov     [di-3172], ax
        mov     [di-3224], ax
        mov     [di-3276], ax
        mov     [di-3328], ax
        mov     [di-3380], ax
        mov     [di-3432], ax
        mov     [di-3484], ax
        mov     [di-3536], ax
        mov     [di-3588], ax
        mov     [di-3640], ax
        mov     [di-3692], ax
        mov     [di-3744], ax
        sub     di, BOMBS * S5
        loop    .next
        jmp     c5
.next:  jmp     .pass

; Cell 6: up, 84 bytes between bombs.
c6:     lea     di, [bx+SIZE]
        mov     cx, (0x10000 - SIZE - 2) / (BOMBS * S6)
.pass:
        mov     [di], ax
        mov     [di+84], ax
        mov     [di+168], ax
        mov     [di+252], ax
        mov     [di+336], ax
        mov     [di+420], ax
        mov     [di+504], ax
        mov     [di+588], ax
        mov     [di+672], ax
        mov     [di+756], ax
        mov     [di+840], ax
        mov     [di+924], ax
        mov     [di+1008], ax
        mov     [di+1092], ax
        mov     [di+1176], ax
        mov     [di+1260], ax
        mov     [di+1344], ax
        mov     [di+1428], ax
        mov     [di+1512], ax
        mov     [di+1596], ax
        mov     [di+1680], ax
        mov     [di+1764], ax
        mov     [di+1848], ax
        mov     [di+1932], ax
        mov     [di+2016], ax
        mov     [di+2100], ax
        mov     [di+2184], ax
        mov     [di+2268], ax
        mov     [di+2352], ax
        mov     [di+2436], ax
        mov     [di+2520], ax
        mov     [di+2604], ax
        mov     [di+2688], ax
        mov     [di+2772], ax
        mov     [di+2856], ax
        mov     [di+2940], ax
        mov     [di+3024], ax
        mov     [di+3108], ax
        mov     [di+3192], ax
        mov     [di+3276], ax
        mov     [di+3360], ax
        mov     [di+3444], ax
        mov     [di+3528], ax
        mov     [di+3612], ax
        mov     [di+3696], ax
        mov     [di+3780], ax
        mov     [di+3864], ax
        mov     [di+3948], ax
        mov     [di+4032], ax
        mov     [di+4116], ax
        mov     [di+4200], ax
        mov     [di+4284], ax
        mov     [di+4368], ax
        mov     [di+4452], ax
        mov     [di+4536], ax
        mov     [di+4620], ax
        mov     [di+4704], ax
        mov     [di+4788], ax
        mov     [di+4872], ax
        mov     [di+4956], ax
        mov     [di+5040], ax
        mov     [di+5124], ax
        mov     [di+5208], ax
        mov     [di+5292], ax
        mov     [di+5376], ax
        mov     [di+5460], ax
        mov     [di+5544], ax
        mov     [di+5628], ax
        mov     [di+5712], ax
        mov     [di+5796], ax
        mov     [di+5880], ax
        mov     [di+5964], ax
        add     di, BOMBS * S6
        loop    .next
        jmp     c6
.next:  jmp     .pass

; Cell 7: down, 116 bytes between bombs.
c7:     mov     di, bx
        mov     cx, (0x10000 - SIZE - 2) / (BOMBS * S7)
.pass:
        mov     [di-116], ax
        mov     [di-232], ax
        mov     [di-348], ax
        mov     [di-464], ax
        mov     [di-580], ax
        mov     [di-696], ax
        mov     [di-812], ax
        mov     [di-928], ax
        mov     [di-1044], ax
        mov     [di-1160], ax
        mov     [di-1276], ax
        mov     [di-1392], ax
        mov     [di-1508], ax
        mov     [di-1624], ax
        mov     [di-1740], ax
        mov     [di-1856], ax
        mov     [di-1972], ax
        mov     [di-2088], ax
        mov     [di-2204], ax
        mov     [di-2320], ax
        mov     [di-2436], ax
        mov     [di-2552], ax
        mov     [di-2668], ax
        mov     [di-2784], ax
        mov     [di-2900], ax
        mov     [di-3016], ax
        mov     [di-3132], ax
        mov     [di-3248], ax
        mov     [di-3364], ax
        mov     [di-3480], ax
        mov     [di-3596], ax
        mov     [di-3712], ax
        mov     [di-3828], ax
        mov     [di-3944], ax
        mov     [di-4060], ax
        mov     [di-4176], ax
        mov     [di-4292], ax
        mov     [di-4408], ax
        mov     [di-4524], ax
        mov     [di-4640], ax
        mov     [di-4756], ax
        mov     [di-4872], ax
        mov     [di-4988], ax
        mov     [di-5104], ax
        mov     [di-5220], ax
        mov     [di-5336], ax
        mov     [di-5452], ax
        mov     [di-5568], ax
        mov     [di-5684], ax
        mov     [di-5800], ax
        mov     [di-5916], ax
        mov     [di-6032], ax
        mov     [di-6148], ax
        mov     [di-6264], ax
        mov     [di-6380], ax
        mov     [di-6496], ax
        mov     [di-6612], ax
        mov     [di-6728], ax
        mov     [di-6844], ax
        mov     [di-6960], ax
        mov     [di-7076], ax
        mov     [di-7192], ax
        mov     [di-7308], ax
        mov     [di-7424], ax
        mov     [di-7540], ax
        mov     [di-7656], ax
        mov     [di-7772], ax
        mov     [di-7888], ax
        mov     [di-8004], ax
        mov     [di-8120], ax
        mov     [di-8236], ax
        mov     [di-8352], ax
        sub     di, BOMBS * S7
        loop    .next
        jmp     c7
.next:  jmp     .pass

end:
