; Overlord is a vampire with a bite of 128 fangs over 1 KB and a pit that zeros 2 KB of the home
; of each bot it bites. It scans up from the top of its body and down from its base at once, 96
; words 12 bytes apart a block, and finds the first word of a hit with repe scasw.
; A bite writes a fang every 8 bytes, each FF 26 and the address of our pit pointer, a jmp through
; it, so each 8 bytes of rival code get a fang, and a process that runs one lands in the pit.
; The pit runs with the registers of the bitten process: it starts a process of the bitten bot on
; each 64 bytes of the 2 KB from its bx, the home of a house-style bot, and each one zeros its 64
; bytes and dies, so the bot zeros its own home with its own turns.
; A hit on an imp trail gets no bite: repne scasw walks up the trail to its head, and the scan
; writes a DAT 16 bytes over the head on each of its turns for 300 turns. Overlord runs one
; process, so the gate is shut on every turn, and an imp that walks into it dies.
; The scan and the bite are what make Overlord a super-heavy: 192 sampled words and 256 fang
; writes, unrolled, they are 1,790 of its 2,265 bytes; the scan runs all the time, and the bite on
; each hit.
; vs imp.asm, seeds 1..20: 20 W / 0 T / 0 L
; vs dwarf.asm, seeds 1..20: 20 W / 0 T / 0 L

%name     "Overlord"
%author   "ASM Bots"
%strategy "Bite 1 KB with fangs, zero 2 KB from the pit, gate imps"

K       equ     12                      ; bytes between sampled words
BLOCK   equ     96 * K                  ; bytes a block of samples covers
FANGS   equ     128                     ; fangs in a bite
BITE    equ     FANGS * 8               ; bytes a bite covers: a fang every 8 bytes
BELOW   equ     64                      ; a bite starts this far under what the up scan hit
AHEAD   equ     16                      ; the imp gate is this far over the imp's head
SPAN    equ     2048                    ; bytes of home a held process zeros
ROUNDS  equ     5                       ; rounds of the gate, 60 writes each
CHUNK   equ     64                      ; bytes a pit process zeros
CAP     equ     8192                    ; words the head search reads at most
FANG    equ     0x26FF                  ; FF 26: jmp word [disp16], the first word of a fang
SIZE    equ     end - start
HALF    equ     (0x10000 - SIZE) / 2 + 1024 ; bytes each pointer scans in a lap

; Setup: the base idiom puts our base address in bx; the pit pointer gets the pit's address.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        lea     ax, [bx+pit]
        mov     [bx+pitp], ax
        lea     sp, [bx+stack]          ; our calls and pushes stay in our body, off the scans
        cld

; Lap: di scans up from the top of the body, bp down from the base, a block each at a time.
lap:    lea     di, [bx+SIZE+8]
        lea     bp, [bx-8]

; Scan: or together 96 words K bytes apart over each block; a block that is not all zero is a hit.
; Each pointer scans HALF bytes, a little over half the free core, and then waits for the other.
scan:   mov     ax, di
        sub     ax, bx
        cmp     ax, SIZE + HALF
        jb      .up
        jmp     .down
.up:    mov     ax, [di+0]
        or      ax, [di+12]
        or      ax, [di+24]
        or      ax, [di+36]
        or      ax, [di+48]
        or      ax, [di+60]
        or      ax, [di+72]
        or      ax, [di+84]
        or      ax, [di+96]
        or      ax, [di+108]
        or      ax, [di+120]
        or      ax, [di+132]
        or      ax, [di+144]
        or      ax, [di+156]
        or      ax, [di+168]
        or      ax, [di+180]
        or      ax, [di+192]
        or      ax, [di+204]
        or      ax, [di+216]
        or      ax, [di+228]
        or      ax, [di+240]
        or      ax, [di+252]
        or      ax, [di+264]
        or      ax, [di+276]
        or      ax, [di+288]
        or      ax, [di+300]
        or      ax, [di+312]
        or      ax, [di+324]
        or      ax, [di+336]
        or      ax, [di+348]
        or      ax, [di+360]
        or      ax, [di+372]
        or      ax, [di+384]
        or      ax, [di+396]
        or      ax, [di+408]
        or      ax, [di+420]
        or      ax, [di+432]
        or      ax, [di+444]
        or      ax, [di+456]
        or      ax, [di+468]
        or      ax, [di+480]
        or      ax, [di+492]
        or      ax, [di+504]
        or      ax, [di+516]
        or      ax, [di+528]
        or      ax, [di+540]
        or      ax, [di+552]
        or      ax, [di+564]
        or      ax, [di+576]
        or      ax, [di+588]
        or      ax, [di+600]
        or      ax, [di+612]
        or      ax, [di+624]
        or      ax, [di+636]
        or      ax, [di+648]
        or      ax, [di+660]
        or      ax, [di+672]
        or      ax, [di+684]
        or      ax, [di+696]
        or      ax, [di+708]
        or      ax, [di+720]
        or      ax, [di+732]
        or      ax, [di+744]
        or      ax, [di+756]
        or      ax, [di+768]
        or      ax, [di+780]
        or      ax, [di+792]
        or      ax, [di+804]
        or      ax, [di+816]
        or      ax, [di+828]
        or      ax, [di+840]
        or      ax, [di+852]
        or      ax, [di+864]
        or      ax, [di+876]
        or      ax, [di+888]
        or      ax, [di+900]
        or      ax, [di+912]
        or      ax, [di+924]
        or      ax, [di+936]
        or      ax, [di+948]
        or      ax, [di+960]
        or      ax, [di+972]
        or      ax, [di+984]
        or      ax, [di+996]
        or      ax, [di+1008]
        or      ax, [di+1020]
        or      ax, [di+1032]
        or      ax, [di+1044]
        or      ax, [di+1056]
        or      ax, [di+1068]
        or      ax, [di+1080]
        or      ax, [di+1092]
        or      ax, [di+1104]
        or      ax, [di+1116]
        or      ax, [di+1128]
        or      ax, [di+1140]
        jz      .down
        jmp     up_hit
.down:  mov     ax, bx
        sub     ax, bp
        cmp     ax, HALF
        jb      .dn
        jmp     step
.dn:    mov     ax, [bp+0]
        or      ax, [bp-12]
        or      ax, [bp-24]
        or      ax, [bp-36]
        or      ax, [bp-48]
        or      ax, [bp-60]
        or      ax, [bp-72]
        or      ax, [bp-84]
        or      ax, [bp-96]
        or      ax, [bp-108]
        or      ax, [bp-120]
        or      ax, [bp-132]
        or      ax, [bp-144]
        or      ax, [bp-156]
        or      ax, [bp-168]
        or      ax, [bp-180]
        or      ax, [bp-192]
        or      ax, [bp-204]
        or      ax, [bp-216]
        or      ax, [bp-228]
        or      ax, [bp-240]
        or      ax, [bp-252]
        or      ax, [bp-264]
        or      ax, [bp-276]
        or      ax, [bp-288]
        or      ax, [bp-300]
        or      ax, [bp-312]
        or      ax, [bp-324]
        or      ax, [bp-336]
        or      ax, [bp-348]
        or      ax, [bp-360]
        or      ax, [bp-372]
        or      ax, [bp-384]
        or      ax, [bp-396]
        or      ax, [bp-408]
        or      ax, [bp-420]
        or      ax, [bp-432]
        or      ax, [bp-444]
        or      ax, [bp-456]
        or      ax, [bp-468]
        or      ax, [bp-480]
        or      ax, [bp-492]
        or      ax, [bp-504]
        or      ax, [bp-516]
        or      ax, [bp-528]
        or      ax, [bp-540]
        or      ax, [bp-552]
        or      ax, [bp-564]
        or      ax, [bp-576]
        or      ax, [bp-588]
        or      ax, [bp-600]
        or      ax, [bp-612]
        or      ax, [bp-624]
        or      ax, [bp-636]
        or      ax, [bp-648]
        or      ax, [bp-660]
        or      ax, [bp-672]
        or      ax, [bp-684]
        or      ax, [bp-696]
        or      ax, [bp-708]
        or      ax, [bp-720]
        or      ax, [bp-732]
        or      ax, [bp-744]
        or      ax, [bp-756]
        or      ax, [bp-768]
        or      ax, [bp-780]
        or      ax, [bp-792]
        or      ax, [bp-804]
        or      ax, [bp-816]
        or      ax, [bp-828]
        or      ax, [bp-840]
        or      ax, [bp-852]
        or      ax, [bp-864]
        or      ax, [bp-876]
        or      ax, [bp-888]
        or      ax, [bp-900]
        or      ax, [bp-912]
        or      ax, [bp-924]
        or      ax, [bp-936]
        or      ax, [bp-948]
        or      ax, [bp-960]
        or      ax, [bp-972]
        or      ax, [bp-984]
        or      ax, [bp-996]
        or      ax, [bp-1008]
        or      ax, [bp-1020]
        or      ax, [bp-1032]
        or      ax, [bp-1044]
        or      ax, [bp-1056]
        or      ax, [bp-1068]
        or      ax, [bp-1080]
        or      ax, [bp-1092]
        or      ax, [bp-1104]
        or      ax, [bp-1116]
        or      ax, [bp-1128]
        or      ax, [bp-1140]
        jz      step
        jmp     dn_hit

; Step: both pointers move a block on; when both have scanned HALF bytes, the lap is over.
step:   add     di, BLOCK
        sub     bp, BLOCK
.meet:  mov     ax, di
        sub     ax, bx
        cmp     ax, SIZE + HALF
        jb      .on
        mov     ax, bx
        sub     ax, bp
        cmp     ax, HALF
        jb      .on
        jmp     lap
.on:    jmp     scan

; Up hit: repe scasw finds the lowest word that is not zero; bite from BELOW bytes under it.
up_hit: mov     cx, BLOCK / 2
        xor     ax, ax
        repe    scasw
        lea     si, [di-2]
        call    is_imp
        je      .imp
        sub     si, BELOW
        call    bite
        lea     di, [si+BITE]
        jmp     step.meet
; An imp trail: gate its head, and go on scanning over the head.
.imp:   call    imp
        add     di, AHEAD + 8
        jmp     step.meet

; Down hit: std and repe scasw find the highest word that is not zero; bite from under it.
dn_hit: push    di
        lea     di, [bp+6]
        mov     cx, BLOCK / 2 + 4
        xor     ax, ax
        std
        repe    scasw
        cld
        lea     si, [di+2]
        pop     di
        call    is_imp
        je      .imp
        sub     si, BITE - BELOW
        call    bite
        lea     bp, [si-8]
        jmp     step.meet
; An imp trail: gate its head, then std and repne scasw find its tail, and the down scan goes on
; under the tail.
.imp:   push    di
        call    imp
        mov     di, si
        mov     cx, CAP
        xor     ax, ax
        std
        repne   scasw
        cld
        lea     bp, [di-6]
        pop     di
        jmp     step.meet

; Imp: si is a word of an imp trail. repne scasw walks up the trail to its head, the first zero
; word, and the gate stops the imp AHEAD bytes over it. di is left on the head.
imp:    push    si
        mov     di, si
        mov     cx, CAP
        xor     ax, ax
        repne   scasw
        push    di
        lea     si, [di+AHEAD]
        call    gate
        pop     di
        pop     si
        ret

; Is imp: ZF set when the word at si is an imp's movsw and nop, at either byte.
is_imp: cmp     word [si], 0x90A5
        je      .yes
        cmp     word [si], 0xA590
.yes:   ret

; Gate: write a DAT on the word at si once a cycle, while the imp walks into it. A gate on or
; near our own body would break it: skip it.
gate:   mov     ax, si
        sub     ax, bx
        add     ax, 64
        cmp     ax, SIZE + 128
        jae     .shut
        ret
.shut:  xor     ax, ax
        mov     cx, ROUNDS
.round:
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        mov     [si], ax
        loop    .round
        ret

; Bite: a fang every 8 bytes from si up, each FF 26 and the address of the pit pointer. Skip a
; bite that would land on our own body.
bite:   mov     ax, si
        sub     ax, bx
        add     ax, BITE + 8
        cmp     ax, SIZE + BITE + 16
        jae     .bite
        ret
.bite:  mov     ax, FANG
        lea     dx, [bx+pitp]
        mov     [si+0], ax
        mov     [si+2], dx
        mov     [si+8], ax
        mov     [si+10], dx
        mov     [si+16], ax
        mov     [si+18], dx
        mov     [si+24], ax
        mov     [si+26], dx
        mov     [si+32], ax
        mov     [si+34], dx
        mov     [si+40], ax
        mov     [si+42], dx
        mov     [si+48], ax
        mov     [si+50], dx
        mov     [si+56], ax
        mov     [si+58], dx
        mov     [si+64], ax
        mov     [si+66], dx
        mov     [si+72], ax
        mov     [si+74], dx
        mov     [si+80], ax
        mov     [si+82], dx
        mov     [si+88], ax
        mov     [si+90], dx
        mov     [si+96], ax
        mov     [si+98], dx
        mov     [si+104], ax
        mov     [si+106], dx
        mov     [si+112], ax
        mov     [si+114], dx
        mov     [si+120], ax
        mov     [si+122], dx
        mov     [si+128], ax
        mov     [si+130], dx
        mov     [si+136], ax
        mov     [si+138], dx
        mov     [si+144], ax
        mov     [si+146], dx
        mov     [si+152], ax
        mov     [si+154], dx
        mov     [si+160], ax
        mov     [si+162], dx
        mov     [si+168], ax
        mov     [si+170], dx
        mov     [si+176], ax
        mov     [si+178], dx
        mov     [si+184], ax
        mov     [si+186], dx
        mov     [si+192], ax
        mov     [si+194], dx
        mov     [si+200], ax
        mov     [si+202], dx
        mov     [si+208], ax
        mov     [si+210], dx
        mov     [si+216], ax
        mov     [si+218], dx
        mov     [si+224], ax
        mov     [si+226], dx
        mov     [si+232], ax
        mov     [si+234], dx
        mov     [si+240], ax
        mov     [si+242], dx
        mov     [si+248], ax
        mov     [si+250], dx
        mov     [si+256], ax
        mov     [si+258], dx
        mov     [si+264], ax
        mov     [si+266], dx
        mov     [si+272], ax
        mov     [si+274], dx
        mov     [si+280], ax
        mov     [si+282], dx
        mov     [si+288], ax
        mov     [si+290], dx
        mov     [si+296], ax
        mov     [si+298], dx
        mov     [si+304], ax
        mov     [si+306], dx
        mov     [si+312], ax
        mov     [si+314], dx
        mov     [si+320], ax
        mov     [si+322], dx
        mov     [si+328], ax
        mov     [si+330], dx
        mov     [si+336], ax
        mov     [si+338], dx
        mov     [si+344], ax
        mov     [si+346], dx
        mov     [si+352], ax
        mov     [si+354], dx
        mov     [si+360], ax
        mov     [si+362], dx
        mov     [si+368], ax
        mov     [si+370], dx
        mov     [si+376], ax
        mov     [si+378], dx
        mov     [si+384], ax
        mov     [si+386], dx
        mov     [si+392], ax
        mov     [si+394], dx
        mov     [si+400], ax
        mov     [si+402], dx
        mov     [si+408], ax
        mov     [si+410], dx
        mov     [si+416], ax
        mov     [si+418], dx
        mov     [si+424], ax
        mov     [si+426], dx
        mov     [si+432], ax
        mov     [si+434], dx
        mov     [si+440], ax
        mov     [si+442], dx
        mov     [si+448], ax
        mov     [si+450], dx
        mov     [si+456], ax
        mov     [si+458], dx
        mov     [si+464], ax
        mov     [si+466], dx
        mov     [si+472], ax
        mov     [si+474], dx
        mov     [si+480], ax
        mov     [si+482], dx
        mov     [si+488], ax
        mov     [si+490], dx
        mov     [si+496], ax
        mov     [si+498], dx
        mov     [si+504], ax
        mov     [si+506], dx
        mov     [si+512], ax
        mov     [si+514], dx
        mov     [si+520], ax
        mov     [si+522], dx
        mov     [si+528], ax
        mov     [si+530], dx
        mov     [si+536], ax
        mov     [si+538], dx
        mov     [si+544], ax
        mov     [si+546], dx
        mov     [si+552], ax
        mov     [si+554], dx
        mov     [si+560], ax
        mov     [si+562], dx
        mov     [si+568], ax
        mov     [si+570], dx
        mov     [si+576], ax
        mov     [si+578], dx
        mov     [si+584], ax
        mov     [si+586], dx
        mov     [si+592], ax
        mov     [si+594], dx
        mov     [si+600], ax
        mov     [si+602], dx
        mov     [si+608], ax
        mov     [si+610], dx
        mov     [si+616], ax
        mov     [si+618], dx
        mov     [si+624], ax
        mov     [si+626], dx
        mov     [si+632], ax
        mov     [si+634], dx
        mov     [si+640], ax
        mov     [si+642], dx
        mov     [si+648], ax
        mov     [si+650], dx
        mov     [si+656], ax
        mov     [si+658], dx
        mov     [si+664], ax
        mov     [si+666], dx
        mov     [si+672], ax
        mov     [si+674], dx
        mov     [si+680], ax
        mov     [si+682], dx
        mov     [si+688], ax
        mov     [si+690], dx
        mov     [si+696], ax
        mov     [si+698], dx
        mov     [si+704], ax
        mov     [si+706], dx
        mov     [si+712], ax
        mov     [si+714], dx
        mov     [si+720], ax
        mov     [si+722], dx
        mov     [si+728], ax
        mov     [si+730], dx
        mov     [si+736], ax
        mov     [si+738], dx
        mov     [si+744], ax
        mov     [si+746], dx
        mov     [si+752], ax
        mov     [si+754], dx
        mov     [si+760], ax
        mov     [si+762], dx
        mov     [si+768], ax
        mov     [si+770], dx
        mov     [si+776], ax
        mov     [si+778], dx
        mov     [si+784], ax
        mov     [si+786], dx
        mov     [si+792], ax
        mov     [si+794], dx
        mov     [si+800], ax
        mov     [si+802], dx
        mov     [si+808], ax
        mov     [si+810], dx
        mov     [si+816], ax
        mov     [si+818], dx
        mov     [si+824], ax
        mov     [si+826], dx
        mov     [si+832], ax
        mov     [si+834], dx
        mov     [si+840], ax
        mov     [si+842], dx
        mov     [si+848], ax
        mov     [si+850], dx
        mov     [si+856], ax
        mov     [si+858], dx
        mov     [si+864], ax
        mov     [si+866], dx
        mov     [si+872], ax
        mov     [si+874], dx
        mov     [si+880], ax
        mov     [si+882], dx
        mov     [si+888], ax
        mov     [si+890], dx
        mov     [si+896], ax
        mov     [si+898], dx
        mov     [si+904], ax
        mov     [si+906], dx
        mov     [si+912], ax
        mov     [si+914], dx
        mov     [si+920], ax
        mov     [si+922], dx
        mov     [si+928], ax
        mov     [si+930], dx
        mov     [si+936], ax
        mov     [si+938], dx
        mov     [si+944], ax
        mov     [si+946], dx
        mov     [si+952], ax
        mov     [si+954], dx
        mov     [si+960], ax
        mov     [si+962], dx
        mov     [si+968], ax
        mov     [si+970], dx
        mov     [si+976], ax
        mov     [si+978], dx
        mov     [si+984], ax
        mov     [si+986], dx
        mov     [si+992], ax
        mov     [si+994], dx
        mov     [si+1000], ax
        mov     [si+1002], dx
        mov     [si+1008], ax
        mov     [si+1010], dx
        mov     [si+1016], ax
        mov     [si+1018], dx
        ret

; Pit: a bitten process runs this with its own registers. It starts a process of its bot on each
; CHUNK bytes of the SPAN bytes from its bx, the home of a house-style bot; each one zeros its
; chunk and dies, and the bitten process dies after the last start. A bx that points near our
; body gets no zeros: the process dies at once.
pit:    call    .me
.me:    pop     di
        sub     di, .me
        lea     si, [bx+SPAN]
        sub     si, di
        cmp     si, SIZE + SPAN
        jb      .die
        xor     si, si
        xor     ax, ax
.split: spl     .zero
        add     si, CHUNK
        cmp     si, SPAN
        jb      .split
.die:   jmp     tomb
.zero:
        mov     [bx+si+0], ax
        mov     [bx+si+2], ax
        mov     [bx+si+4], ax
        mov     [bx+si+6], ax
        mov     [bx+si+8], ax
        mov     [bx+si+10], ax
        mov     [bx+si+12], ax
        mov     [bx+si+14], ax
        mov     [bx+si+16], ax
        mov     [bx+si+18], ax
        mov     [bx+si+20], ax
        mov     [bx+si+22], ax
        mov     [bx+si+24], ax
        mov     [bx+si+26], ax
        mov     [bx+si+28], ax
        mov     [bx+si+30], ax
        mov     [bx+si+32], ax
        mov     [bx+si+34], ax
        mov     [bx+si+36], ax
        mov     [bx+si+38], ax
        mov     [bx+si+40], ax
        mov     [bx+si+42], ax
        mov     [bx+si+44], ax
        mov     [bx+si+46], ax
        mov     [bx+si+48], ax
        mov     [bx+si+50], ax
        mov     [bx+si+52], ax
        mov     [bx+si+54], ax
        mov     [bx+si+56], ax
        mov     [bx+si+58], ax
        mov     [bx+si+60], ax
        mov     [bx+si+62], ax
        jmp     tomb

; Data: the pit pointer, which the fangs jump through; the tomb, a DAT a held process dies on;
; and our stack, 8 words under its top.
pitp:   dw      0

tomb:   dw      0
        dw      0, 0, 0, 0, 0, 0, 0, 0

stack:
end:
