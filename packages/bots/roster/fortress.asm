; Fortress is a stone of three unrolled bombers with an imp gate on each side of them, five
; processes in all: bomber A walks up from the top of the body, 8 bytes between DAT words, bomber
; B walks down from the base, 12 bytes apart, and bomber C walks down 36 bytes apart.
; An imp walks up the core, so it gets to the low gate, 16 bytes under the base, first. A gate
; process writes a DAT on the gate word on eight of its ten turns, and an imp that copies itself
; onto the word and runs it after the DAT dies there.
; The low gate also looks at a tripwire word 512 bytes under the base: when the word is not zero,
; something is on its way up, and the gate fills every free slot with processes that all write on
; the gate word, so the imp meets a DAT on almost every one of our turns when it gets there.
; The high gate is a word over the bombers and under the code of the gates: an imp that gets past
; the low gate and through the bombers meets it before it can take over the gates.
; The bombers are what make Fortress a super-heavy: they are 2,011 of its 2,137 bytes, and all
; three run.
; vs imp.asm, seeds 1..20: 20 W / 0 T / 0 L
; vs dwarf.asm, seeds 1..20: 20 W / 0 T / 0 L

%name     "Fortress"
%author   "ASM Bots"
%strategy "Three bombers between two imp gates"

BOMBS   equ     168                     ; DAT words in a pass of each bomber
STEP_A  equ     8                       ; bytes between bombs of bomber A
STEP_B  equ     12                      ; of bomber B
STEP_C  equ     36                      ; of bomber C
GATE    equ     16                      ; the low gate word is this far under the base
TRIP    equ     512                     ; the tripwire word is this far under the base
SIZE    equ     end - start
LAP_A   equ     (0x10000 - SIZE) / (BOMBS * STEP_A) ; passes in a lap of bomber A
LAP_B   equ     (0x10000 - SIZE) / (BOMBS * STEP_B)
LAP_C   equ     (0x10000 - SIZE) / (BOMBS * STEP_C)

; Setup: the base idiom puts our base address in bx, and ax = 0 is the bomb; start the two gates
; and bombers B and C, and run bomber A.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        xor     ax, ax
        spl     low
        spl     high
        spl     bomb_b
        spl     bomb_c

; Bomber A: each lap starts over the top of the body and walks up, BOMBS DAT words a pass, 8
; bytes apart. It gets to a dwarf over us long before the dwarf gets to us.
bomb_a: lea     di, [bx+SIZE+BOMBS/2*STEP_A]
        mov     cx, LAP_A
.pass:
        mov     [di+664], ax
        mov     [di+656], ax
        mov     [di+648], ax
        mov     [di+640], ax
        mov     [di+632], ax
        mov     [di+624], ax
        mov     [di+616], ax
        mov     [di+608], ax
        mov     [di+600], ax
        mov     [di+592], ax
        mov     [di+584], ax
        mov     [di+576], ax
        mov     [di+568], ax
        mov     [di+560], ax
        mov     [di+552], ax
        mov     [di+544], ax
        mov     [di+536], ax
        mov     [di+528], ax
        mov     [di+520], ax
        mov     [di+512], ax
        mov     [di+504], ax
        mov     [di+496], ax
        mov     [di+488], ax
        mov     [di+480], ax
        mov     [di+472], ax
        mov     [di+464], ax
        mov     [di+456], ax
        mov     [di+448], ax
        mov     [di+440], ax
        mov     [di+432], ax
        mov     [di+424], ax
        mov     [di+416], ax
        mov     [di+408], ax
        mov     [di+400], ax
        mov     [di+392], ax
        mov     [di+384], ax
        mov     [di+376], ax
        mov     [di+368], ax
        mov     [di+360], ax
        mov     [di+352], ax
        mov     [di+344], ax
        mov     [di+336], ax
        mov     [di+328], ax
        mov     [di+320], ax
        mov     [di+312], ax
        mov     [di+304], ax
        mov     [di+296], ax
        mov     [di+288], ax
        mov     [di+280], ax
        mov     [di+272], ax
        mov     [di+264], ax
        mov     [di+256], ax
        mov     [di+248], ax
        mov     [di+240], ax
        mov     [di+232], ax
        mov     [di+224], ax
        mov     [di+216], ax
        mov     [di+208], ax
        mov     [di+200], ax
        mov     [di+192], ax
        mov     [di+184], ax
        mov     [di+176], ax
        mov     [di+168], ax
        mov     [di+160], ax
        mov     [di+152], ax
        mov     [di+144], ax
        mov     [di+136], ax
        mov     [di+128], ax
        mov     [di+120], ax
        mov     [di+112], ax
        mov     [di+104], ax
        mov     [di+96], ax
        mov     [di+88], ax
        mov     [di+80], ax
        mov     [di+72], ax
        mov     [di+64], ax
        mov     [di+56], ax
        mov     [di+48], ax
        mov     [di+40], ax
        mov     [di+32], ax
        mov     [di+24], ax
        mov     [di+16], ax
        mov     [di+8], ax
        mov     [di+0], ax
        mov     [di-8], ax
        mov     [di-16], ax
        mov     [di-24], ax
        mov     [di-32], ax
        mov     [di-40], ax
        mov     [di-48], ax
        mov     [di-56], ax
        mov     [di-64], ax
        mov     [di-72], ax
        mov     [di-80], ax
        mov     [di-88], ax
        mov     [di-96], ax
        mov     [di-104], ax
        mov     [di-112], ax
        mov     [di-120], ax
        mov     [di-128], ax
        mov     [di-136], ax
        mov     [di-144], ax
        mov     [di-152], ax
        mov     [di-160], ax
        mov     [di-168], ax
        mov     [di-176], ax
        mov     [di-184], ax
        mov     [di-192], ax
        mov     [di-200], ax
        mov     [di-208], ax
        mov     [di-216], ax
        mov     [di-224], ax
        mov     [di-232], ax
        mov     [di-240], ax
        mov     [di-248], ax
        mov     [di-256], ax
        mov     [di-264], ax
        mov     [di-272], ax
        mov     [di-280], ax
        mov     [di-288], ax
        mov     [di-296], ax
        mov     [di-304], ax
        mov     [di-312], ax
        mov     [di-320], ax
        mov     [di-328], ax
        mov     [di-336], ax
        mov     [di-344], ax
        mov     [di-352], ax
        mov     [di-360], ax
        mov     [di-368], ax
        mov     [di-376], ax
        mov     [di-384], ax
        mov     [di-392], ax
        mov     [di-400], ax
        mov     [di-408], ax
        mov     [di-416], ax
        mov     [di-424], ax
        mov     [di-432], ax
        mov     [di-440], ax
        mov     [di-448], ax
        mov     [di-456], ax
        mov     [di-464], ax
        mov     [di-472], ax
        mov     [di-480], ax
        mov     [di-488], ax
        mov     [di-496], ax
        mov     [di-504], ax
        mov     [di-512], ax
        mov     [di-520], ax
        mov     [di-528], ax
        mov     [di-536], ax
        mov     [di-544], ax
        mov     [di-552], ax
        mov     [di-560], ax
        mov     [di-568], ax
        mov     [di-576], ax
        mov     [di-584], ax
        mov     [di-592], ax
        mov     [di-600], ax
        mov     [di-608], ax
        mov     [di-616], ax
        mov     [di-624], ax
        mov     [di-632], ax
        mov     [di-640], ax
        mov     [di-648], ax
        mov     [di-656], ax
        mov     [di-664], ax
        mov     [di-672], ax
        add     di, BOMBS * STEP_A
        loop    .next
        jmp     bomb_a
.next:  jmp     .pass

; Bomber B: each lap starts under the base and walks down, BOMBS DAT words a pass, 12 bytes apart.
bomb_b: lea     si, [bx-(BOMBS/2-1)*STEP_B-2]
        mov     cx, LAP_B
.pass:
        mov     [si-1008], ax
        mov     [si-996], ax
        mov     [si-984], ax
        mov     [si-972], ax
        mov     [si-960], ax
        mov     [si-948], ax
        mov     [si-936], ax
        mov     [si-924], ax
        mov     [si-912], ax
        mov     [si-900], ax
        mov     [si-888], ax
        mov     [si-876], ax
        mov     [si-864], ax
        mov     [si-852], ax
        mov     [si-840], ax
        mov     [si-828], ax
        mov     [si-816], ax
        mov     [si-804], ax
        mov     [si-792], ax
        mov     [si-780], ax
        mov     [si-768], ax
        mov     [si-756], ax
        mov     [si-744], ax
        mov     [si-732], ax
        mov     [si-720], ax
        mov     [si-708], ax
        mov     [si-696], ax
        mov     [si-684], ax
        mov     [si-672], ax
        mov     [si-660], ax
        mov     [si-648], ax
        mov     [si-636], ax
        mov     [si-624], ax
        mov     [si-612], ax
        mov     [si-600], ax
        mov     [si-588], ax
        mov     [si-576], ax
        mov     [si-564], ax
        mov     [si-552], ax
        mov     [si-540], ax
        mov     [si-528], ax
        mov     [si-516], ax
        mov     [si-504], ax
        mov     [si-492], ax
        mov     [si-480], ax
        mov     [si-468], ax
        mov     [si-456], ax
        mov     [si-444], ax
        mov     [si-432], ax
        mov     [si-420], ax
        mov     [si-408], ax
        mov     [si-396], ax
        mov     [si-384], ax
        mov     [si-372], ax
        mov     [si-360], ax
        mov     [si-348], ax
        mov     [si-336], ax
        mov     [si-324], ax
        mov     [si-312], ax
        mov     [si-300], ax
        mov     [si-288], ax
        mov     [si-276], ax
        mov     [si-264], ax
        mov     [si-252], ax
        mov     [si-240], ax
        mov     [si-228], ax
        mov     [si-216], ax
        mov     [si-204], ax
        mov     [si-192], ax
        mov     [si-180], ax
        mov     [si-168], ax
        mov     [si-156], ax
        mov     [si-144], ax
        mov     [si-132], ax
        mov     [si-120], ax
        mov     [si-108], ax
        mov     [si-96], ax
        mov     [si-84], ax
        mov     [si-72], ax
        mov     [si-60], ax
        mov     [si-48], ax
        mov     [si-36], ax
        mov     [si-24], ax
        mov     [si-12], ax
        mov     [si+0], ax
        mov     [si+12], ax
        mov     [si+24], ax
        mov     [si+36], ax
        mov     [si+48], ax
        mov     [si+60], ax
        mov     [si+72], ax
        mov     [si+84], ax
        mov     [si+96], ax
        mov     [si+108], ax
        mov     [si+120], ax
        mov     [si+132], ax
        mov     [si+144], ax
        mov     [si+156], ax
        mov     [si+168], ax
        mov     [si+180], ax
        mov     [si+192], ax
        mov     [si+204], ax
        mov     [si+216], ax
        mov     [si+228], ax
        mov     [si+240], ax
        mov     [si+252], ax
        mov     [si+264], ax
        mov     [si+276], ax
        mov     [si+288], ax
        mov     [si+300], ax
        mov     [si+312], ax
        mov     [si+324], ax
        mov     [si+336], ax
        mov     [si+348], ax
        mov     [si+360], ax
        mov     [si+372], ax
        mov     [si+384], ax
        mov     [si+396], ax
        mov     [si+408], ax
        mov     [si+420], ax
        mov     [si+432], ax
        mov     [si+444], ax
        mov     [si+456], ax
        mov     [si+468], ax
        mov     [si+480], ax
        mov     [si+492], ax
        mov     [si+504], ax
        mov     [si+516], ax
        mov     [si+528], ax
        mov     [si+540], ax
        mov     [si+552], ax
        mov     [si+564], ax
        mov     [si+576], ax
        mov     [si+588], ax
        mov     [si+600], ax
        mov     [si+612], ax
        mov     [si+624], ax
        mov     [si+636], ax
        mov     [si+648], ax
        mov     [si+660], ax
        mov     [si+672], ax
        mov     [si+684], ax
        mov     [si+696], ax
        mov     [si+708], ax
        mov     [si+720], ax
        mov     [si+732], ax
        mov     [si+744], ax
        mov     [si+756], ax
        mov     [si+768], ax
        mov     [si+780], ax
        mov     [si+792], ax
        mov     [si+804], ax
        mov     [si+816], ax
        mov     [si+828], ax
        mov     [si+840], ax
        mov     [si+852], ax
        mov     [si+864], ax
        mov     [si+876], ax
        mov     [si+888], ax
        mov     [si+900], ax
        mov     [si+912], ax
        mov     [si+924], ax
        mov     [si+936], ax
        mov     [si+948], ax
        mov     [si+960], ax
        mov     [si+972], ax
        mov     [si+984], ax
        mov     [si+996], ax
        sub     si, BOMBS * STEP_B
        loop    .next
        jmp     bomb_b
.next:  jmp     .pass

; Bomber C: the same with 36 bytes between bombs, so its laps are three times as fast as B's.
bomb_c: lea     bp, [bx-(BOMBS/2-1)*STEP_C-2]
        mov     cx, LAP_C
.pass:
        mov     [bp-3024], ax
        mov     [bp-2988], ax
        mov     [bp-2952], ax
        mov     [bp-2916], ax
        mov     [bp-2880], ax
        mov     [bp-2844], ax
        mov     [bp-2808], ax
        mov     [bp-2772], ax
        mov     [bp-2736], ax
        mov     [bp-2700], ax
        mov     [bp-2664], ax
        mov     [bp-2628], ax
        mov     [bp-2592], ax
        mov     [bp-2556], ax
        mov     [bp-2520], ax
        mov     [bp-2484], ax
        mov     [bp-2448], ax
        mov     [bp-2412], ax
        mov     [bp-2376], ax
        mov     [bp-2340], ax
        mov     [bp-2304], ax
        mov     [bp-2268], ax
        mov     [bp-2232], ax
        mov     [bp-2196], ax
        mov     [bp-2160], ax
        mov     [bp-2124], ax
        mov     [bp-2088], ax
        mov     [bp-2052], ax
        mov     [bp-2016], ax
        mov     [bp-1980], ax
        mov     [bp-1944], ax
        mov     [bp-1908], ax
        mov     [bp-1872], ax
        mov     [bp-1836], ax
        mov     [bp-1800], ax
        mov     [bp-1764], ax
        mov     [bp-1728], ax
        mov     [bp-1692], ax
        mov     [bp-1656], ax
        mov     [bp-1620], ax
        mov     [bp-1584], ax
        mov     [bp-1548], ax
        mov     [bp-1512], ax
        mov     [bp-1476], ax
        mov     [bp-1440], ax
        mov     [bp-1404], ax
        mov     [bp-1368], ax
        mov     [bp-1332], ax
        mov     [bp-1296], ax
        mov     [bp-1260], ax
        mov     [bp-1224], ax
        mov     [bp-1188], ax
        mov     [bp-1152], ax
        mov     [bp-1116], ax
        mov     [bp-1080], ax
        mov     [bp-1044], ax
        mov     [bp-1008], ax
        mov     [bp-972], ax
        mov     [bp-936], ax
        mov     [bp-900], ax
        mov     [bp-864], ax
        mov     [bp-828], ax
        mov     [bp-792], ax
        mov     [bp-756], ax
        mov     [bp-720], ax
        mov     [bp-684], ax
        mov     [bp-648], ax
        mov     [bp-612], ax
        mov     [bp-576], ax
        mov     [bp-540], ax
        mov     [bp-504], ax
        mov     [bp-468], ax
        mov     [bp-432], ax
        mov     [bp-396], ax
        mov     [bp-360], ax
        mov     [bp-324], ax
        mov     [bp-288], ax
        mov     [bp-252], ax
        mov     [bp-216], ax
        mov     [bp-180], ax
        mov     [bp-144], ax
        mov     [bp-108], ax
        mov     [bp-72], ax
        mov     [bp-36], ax
        mov     [bp+0], ax
        mov     [bp+36], ax
        mov     [bp+72], ax
        mov     [bp+108], ax
        mov     [bp+144], ax
        mov     [bp+180], ax
        mov     [bp+216], ax
        mov     [bp+252], ax
        mov     [bp+288], ax
        mov     [bp+324], ax
        mov     [bp+360], ax
        mov     [bp+396], ax
        mov     [bp+432], ax
        mov     [bp+468], ax
        mov     [bp+504], ax
        mov     [bp+540], ax
        mov     [bp+576], ax
        mov     [bp+612], ax
        mov     [bp+648], ax
        mov     [bp+684], ax
        mov     [bp+720], ax
        mov     [bp+756], ax
        mov     [bp+792], ax
        mov     [bp+828], ax
        mov     [bp+864], ax
        mov     [bp+900], ax
        mov     [bp+936], ax
        mov     [bp+972], ax
        mov     [bp+1008], ax
        mov     [bp+1044], ax
        mov     [bp+1080], ax
        mov     [bp+1116], ax
        mov     [bp+1152], ax
        mov     [bp+1188], ax
        mov     [bp+1224], ax
        mov     [bp+1260], ax
        mov     [bp+1296], ax
        mov     [bp+1332], ax
        mov     [bp+1368], ax
        mov     [bp+1404], ax
        mov     [bp+1440], ax
        mov     [bp+1476], ax
        mov     [bp+1512], ax
        mov     [bp+1548], ax
        mov     [bp+1584], ax
        mov     [bp+1620], ax
        mov     [bp+1656], ax
        mov     [bp+1692], ax
        mov     [bp+1728], ax
        mov     [bp+1764], ax
        mov     [bp+1800], ax
        mov     [bp+1836], ax
        mov     [bp+1872], ax
        mov     [bp+1908], ax
        mov     [bp+1944], ax
        mov     [bp+1980], ax
        mov     [bp+2016], ax
        mov     [bp+2052], ax
        mov     [bp+2088], ax
        mov     [bp+2124], ax
        mov     [bp+2160], ax
        mov     [bp+2196], ax
        mov     [bp+2232], ax
        mov     [bp+2268], ax
        mov     [bp+2304], ax
        mov     [bp+2340], ax
        mov     [bp+2376], ax
        mov     [bp+2412], ax
        mov     [bp+2448], ax
        mov     [bp+2484], ax
        mov     [bp+2520], ax
        mov     [bp+2556], ax
        mov     [bp+2592], ax
        mov     [bp+2628], ax
        mov     [bp+2664], ax
        mov     [bp+2700], ax
        mov     [bp+2736], ax
        mov     [bp+2772], ax
        mov     [bp+2808], ax
        mov     [bp+2844], ax
        mov     [bp+2880], ax
        mov     [bp+2916], ax
        mov     [bp+2952], ax
        mov     [bp+2988], ax
        sub     bp, BOMBS * STEP_C
        loop    .next
        jmp     bomb_c
.next:  jmp     .pass

; The high gate: an imp that got past the low gate and through the bombers dies on this word,
; under the code of the gates.
hgate:  dw      0

; Low gate: write a DAT on the low gate word, and look at the tripwire once a round.
low:
        mov     [bx-GATE], ax
        mov     [bx-GATE], ax
        mov     [bx-GATE], ax
        mov     [bx-GATE], ax
        mov     [bx-GATE], ax
        mov     [bx-GATE], ax
        mov     [bx-GATE], ax
        mov     [bx-GATE], ax
        cmp     word [bx-TRIP], 0
        je      low

; Flood: something wrote on the tripwire, and an imp may be on its way up. Fill the free slots
; with processes that all write DATs on the low gate: a process runs the spl's, and so does each
; child, until the bot is at its cap.
flood:
        spl     flood
        spl     flood
        spl     flood
        spl     flood
        spl     flood
        spl     flood
.gate:
        mov     [bx-GATE], ax
        mov     [bx-GATE], ax
        mov     [bx-GATE], ax
        mov     [bx-GATE], ax
        mov     [bx-GATE], ax
        mov     [bx-GATE], ax
        mov     [bx-GATE], ax
        mov     [bx-GATE], ax
        jmp     .gate

; High gate: write a DAT on the high gate word, forever.
high:
        mov     [bx+hgate], ax
        mov     [bx+hgate], ax
        mov     [bx+hgate], ax
        mov     [bx+hgate], ax
        mov     [bx+hgate], ax
        mov     [bx+hgate], ax
        mov     [bx+hgate], ax
        mov     [bx+hgate], ax
        jmp     high

end:
