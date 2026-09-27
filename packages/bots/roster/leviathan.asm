; Leviathan is four scanners in four cells, and each cell runs a process of its own.
; A cell folds a block of 1,536 bytes into ax with 128 or's, 12 bytes apart, and when the block is
; not all zero, it finds the first word that is not zero with repe scasw and lays a carpet of 32
; zero words over it. Two cells scan up and two scan down, one pair from our body and one from
; the far side of the core, so the four split the core at the start and then go round it again.
; A cell that scans down meets an imp head on: before its carpet it drops a trap of 40 zero bytes
; over the hit, and the imp walks up into it.
; A bomb that kills one cell leaves the other three to scan. The four unrolled folds are what make
; Leviathan a super-heavy: they are 2,000 of its 2,298 bytes, and every one of them runs.
; vs imp.asm, seeds 1..20: 18 W / 2 T / 0 L
; vs dwarf.asm, seeds 1..20: 20 W / 0 T / 0 L

%name     "Leviathan"
%author   "ASM Bots"
%strategy "Four scanners in four cells, two up and two down, all round the core"

GAP     equ     12                      ; bytes between the words the scan reads
BLOCK   equ     128 * GAP               ; bytes a scan folds into ax for one test
TOP     equ     8                       ; the carpet starts this far behind the hit
CWORDS  equ     32                      ; words in a carpet
AHEAD   equ     64                      ; the trap starts this far over the hit
TRAP    equ     40                      ; bytes in the trap
MARGIN  equ     96                      ; a hit this close to the body is our own
SIZE    equ     end - start
HALF    equ     (0x10000 - SIZE) / 2    ; the far side of the core from the body

; Setup: the base idiom puts our base address in bx, and each cell gets bx and a start in di.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        lea     di, [bx+SIZE+MARGIN]    ; up from over the body
        spl     u0
        lea     di, [bx-MARGIN-BLOCK]   ; down from under the body
        spl     d0
        lea     di, [bx+SIZE+HALF]      ; up from the far side
        spl     u1
        lea     di, [bx+SIZE+HALF-BLOCK] ; down from the far side
        jmp     d1

; Cell u0 scans up: fold a block into ax; all zero, and the next block.
u0:     cld
.scan:  xor     ax, ax
        or      ax, [di+0]
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
        or      ax, [di+1152]
        or      ax, [di+1164]
        or      ax, [di+1176]
        or      ax, [di+1188]
        or      ax, [di+1200]
        or      ax, [di+1212]
        or      ax, [di+1224]
        or      ax, [di+1236]
        or      ax, [di+1248]
        or      ax, [di+1260]
        or      ax, [di+1272]
        or      ax, [di+1284]
        or      ax, [di+1296]
        or      ax, [di+1308]
        or      ax, [di+1320]
        or      ax, [di+1332]
        or      ax, [di+1344]
        or      ax, [di+1356]
        or      ax, [di+1368]
        or      ax, [di+1380]
        or      ax, [di+1392]
        or      ax, [di+1404]
        or      ax, [di+1416]
        or      ax, [di+1428]
        or      ax, [di+1440]
        or      ax, [di+1452]
        or      ax, [di+1464]
        or      ax, [di+1476]
        or      ax, [di+1488]
        or      ax, [di+1500]
        or      ax, [di+1512]
        or      ax, [di+1524]
        jnz     .find
        add     di, BLOCK
        jmp     .scan

; Find: the first word that is not zero, from di up. A hit on our own body skips it; else a carpet.
.find:  xor     ax, ax
        mov     cx, BLOCK / 2
        repe    scasw                   ; stops with di 2 bytes over the hit
        jne     .hit
        jmp     .scan                   ; the block went back to zero
.hit:   lea     dx, [di-2+MARGIN]
        sub     dx, bx                  ; dx = hit - (base - MARGIN)
        cmp     dx, SIZE + 2 * MARGIN
        jb      .self
        sub     di, TOP + 2
        mov     cx, CWORDS
        rep     stosw
        jmp     .scan
.self:  lea     di, [bx+SIZE+MARGIN]
        jmp     .scan

; Cell d0 scans down: the same fold, and the find and the carpet step down.
d0:     std
.scan:  xor     ax, ax
        or      ax, [di+0]
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
        or      ax, [di+1152]
        or      ax, [di+1164]
        or      ax, [di+1176]
        or      ax, [di+1188]
        or      ax, [di+1200]
        or      ax, [di+1212]
        or      ax, [di+1224]
        or      ax, [di+1236]
        or      ax, [di+1248]
        or      ax, [di+1260]
        or      ax, [di+1272]
        or      ax, [di+1284]
        or      ax, [di+1296]
        or      ax, [di+1308]
        or      ax, [di+1320]
        or      ax, [di+1332]
        or      ax, [di+1344]
        or      ax, [di+1356]
        or      ax, [di+1368]
        or      ax, [di+1380]
        or      ax, [di+1392]
        or      ax, [di+1404]
        or      ax, [di+1416]
        or      ax, [di+1428]
        or      ax, [di+1440]
        or      ax, [di+1452]
        or      ax, [di+1464]
        or      ax, [di+1476]
        or      ax, [di+1488]
        or      ax, [di+1500]
        or      ax, [di+1512]
        or      ax, [di+1524]
        jnz     .find
        sub     di, BLOCK
        jmp     .scan
.find:  add     di, BLOCK - 2           ; the top word of the block
        xor     ax, ax
        mov     cx, BLOCK / 2
        repe    scasw                   ; stops with di 2 bytes under the hit
        jne     .hit
        sub     di, BLOCK - 2           ; the block went back to zero
        jmp     .scan
.hit:   lea     dx, [di+2+MARGIN]
        sub     dx, bx
        cmp     dx, SIZE + 2 * MARGIN
        jb      .self
        mov     dx, di                  ; a trap over the hit, for an imp
        cld
        add     di, AHEAD + 2
        mov     cx, TRAP
        rep     stosb
        std
        mov     di, dx                  ; the carpet steps down from over the hit
        add     di, TOP + 2
        mov     cx, CWORDS
        rep     stosw
        sub     di, BLOCK - 2           ; the next block ends under the carpet
        jmp     .scan
.self:  lea     di, [bx-MARGIN-BLOCK]
        jmp     .scan

; Cell u1: the same code as u0.
u1:     cld
.scan:  xor     ax, ax
        or      ax, [di+0]
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
        or      ax, [di+1152]
        or      ax, [di+1164]
        or      ax, [di+1176]
        or      ax, [di+1188]
        or      ax, [di+1200]
        or      ax, [di+1212]
        or      ax, [di+1224]
        or      ax, [di+1236]
        or      ax, [di+1248]
        or      ax, [di+1260]
        or      ax, [di+1272]
        or      ax, [di+1284]
        or      ax, [di+1296]
        or      ax, [di+1308]
        or      ax, [di+1320]
        or      ax, [di+1332]
        or      ax, [di+1344]
        or      ax, [di+1356]
        or      ax, [di+1368]
        or      ax, [di+1380]
        or      ax, [di+1392]
        or      ax, [di+1404]
        or      ax, [di+1416]
        or      ax, [di+1428]
        or      ax, [di+1440]
        or      ax, [di+1452]
        or      ax, [di+1464]
        or      ax, [di+1476]
        or      ax, [di+1488]
        or      ax, [di+1500]
        or      ax, [di+1512]
        or      ax, [di+1524]
        jnz     .find
        add     di, BLOCK
        jmp     .scan

.find:  xor     ax, ax
        mov     cx, BLOCK / 2
        repe    scasw                   ; stops with di 2 bytes over the hit
        jne     .hit
        jmp     .scan                   ; the block went back to zero
.hit:   lea     dx, [di-2+MARGIN]
        sub     dx, bx                  ; dx = hit - (base - MARGIN)
        cmp     dx, SIZE + 2 * MARGIN
        jb      .self
        sub     di, TOP + 2
        mov     cx, CWORDS
        rep     stosw
        jmp     .scan
.self:  lea     di, [bx+SIZE+MARGIN]
        jmp     .scan

; Cell d1: the same code as d0.
d1:     std
.scan:  xor     ax, ax
        or      ax, [di+0]
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
        or      ax, [di+1152]
        or      ax, [di+1164]
        or      ax, [di+1176]
        or      ax, [di+1188]
        or      ax, [di+1200]
        or      ax, [di+1212]
        or      ax, [di+1224]
        or      ax, [di+1236]
        or      ax, [di+1248]
        or      ax, [di+1260]
        or      ax, [di+1272]
        or      ax, [di+1284]
        or      ax, [di+1296]
        or      ax, [di+1308]
        or      ax, [di+1320]
        or      ax, [di+1332]
        or      ax, [di+1344]
        or      ax, [di+1356]
        or      ax, [di+1368]
        or      ax, [di+1380]
        or      ax, [di+1392]
        or      ax, [di+1404]
        or      ax, [di+1416]
        or      ax, [di+1428]
        or      ax, [di+1440]
        or      ax, [di+1452]
        or      ax, [di+1464]
        or      ax, [di+1476]
        or      ax, [di+1488]
        or      ax, [di+1500]
        or      ax, [di+1512]
        or      ax, [di+1524]
        jnz     .find
        sub     di, BLOCK
        jmp     .scan
.find:  add     di, BLOCK - 2           ; the top word of the block
        xor     ax, ax
        mov     cx, BLOCK / 2
        repe    scasw                   ; stops with di 2 bytes under the hit
        jne     .hit
        sub     di, BLOCK - 2           ; the block went back to zero
        jmp     .scan
.hit:   lea     dx, [di+2+MARGIN]
        sub     dx, bx
        cmp     dx, SIZE + 2 * MARGIN
        jb      .self
        mov     dx, di                  ; a trap over the hit, for an imp
        cld
        add     di, AHEAD + 2
        mov     cx, TRAP
        rep     stosb
        std
        mov     di, dx                  ; the carpet steps down from over the hit
        add     di, TOP + 2
        mov     cx, CWORDS
        rep     stosw
        sub     di, BLOCK - 2           ; the next block ends under the carpet
        jmp     .scan
.self:  lea     di, [bx-MARGIN-BLOCK]
        jmp     .scan

end:
