; Sweeper scans down the core 1,152 bytes at a time: 48 or's, 24 bytes apart, fold a block into
; ax, and a block that is not all zero gets a repe scasw to find the top word of what it hit.
; It lays a carpet of 32 DAT words with rep stosw from 32 bytes above the hit down, and then
; sweeps: 96 DAT words 16 bytes apart under the carpet, over 1.5 KB, one a turn.
; A middleweight rival is 513 to 1,024 bytes long, and the scan meets its top first: the carpet
; breaks the top and the sweep reaches the rest of the body in 96 turns, where a plain scanner
; finds and carpets it 32 bytes at a time.
; The scan then goes on from under the sweep.
; The unrolled scan and sweep are what make it a middleweight: they are 577 of its 625 bytes, the
; scan runs on every block, and the sweep on every hit.
; vs imp.asm, seeds 1..20: 20 W / 0 T / 0 L
; vs dwarf.asm, seeds 1..20: 20 W / 0 T / 0 L

%name     "Sweeper"
%author   "ASM Bots"
%strategy "Fold-scan the core, then carpet and sweep what I find"

K       equ     24                      ; bytes between the words a scan block reads
ORS     equ     48                      ; words a scan block reads
BLOCK   equ     K * ORS                 ; bytes a scan block covers
TOP     equ     32                      ; the carpet starts this far above the hit
CWORDS  equ     32                      ; words in the dense carpet
WIDE    equ     96                      ; bombs in the wide sweep under the carpet
WSTEP   equ     16                      ; bytes between the bombs of the sweep
REACH   equ     2 * CWORDS - TOP + WIDE * WSTEP ; the sweep reaches this far under the hit
BELOW   equ     TOP + 3                 ; a hit this close under the body is our own
ABOVE   equ     REACH                   ; and so is one this close above it
SIZE    equ     end - start

; Setup: the base idiom puts our base address in bx; the scan steps down from under the body.
start:  call    .here
.here:  pop     bx
        sub     bx, .here
        std                             ; scasw and stosw step down
        lea     di, [bx-BELOW-2]

; Scan: fold 48 words, K bytes apart, into ax; all zero, and the next block.
scan:   mov     ax, [di]
        or      ax, [di-24]
        or      ax, [di-48]
        or      ax, [di-72]
        or      ax, [di-96]
        or      ax, [di-120]
        or      ax, [di-144]
        or      ax, [di-168]
        or      ax, [di-192]
        or      ax, [di-216]
        or      ax, [di-240]
        or      ax, [di-264]
        or      ax, [di-288]
        or      ax, [di-312]
        or      ax, [di-336]
        or      ax, [di-360]
        or      ax, [di-384]
        or      ax, [di-408]
        or      ax, [di-432]
        or      ax, [di-456]
        or      ax, [di-480]
        or      ax, [di-504]
        or      ax, [di-528]
        or      ax, [di-552]
        or      ax, [di-576]
        or      ax, [di-600]
        or      ax, [di-624]
        or      ax, [di-648]
        or      ax, [di-672]
        or      ax, [di-696]
        or      ax, [di-720]
        or      ax, [di-744]
        or      ax, [di-768]
        or      ax, [di-792]
        or      ax, [di-816]
        or      ax, [di-840]
        or      ax, [di-864]
        or      ax, [di-888]
        or      ax, [di-912]
        or      ax, [di-936]
        or      ax, [di-960]
        or      ax, [di-984]
        or      ax, [di-1008]
        or      ax, [di-1032]
        or      ax, [di-1056]
        or      ax, [di-1080]
        or      ax, [di-1104]
        or      ax, [di-1128]
        jnz     find
        sub     di, BLOCK
        jmp     scan

; Find: the top word that is not zero; our body ends the lap, else a carpet.
find:   xor     ax, ax                  ; ax = 0 for the scan and for the bombs
        mov     cx, BLOCK / 2
        repe    scasw                   ; stops with di two bytes under the hit
        jne     .hit
        jmp     scan                    ; the block went back to zero
.hit:   lea     dx, [di+BELOW+2]
        sub     dx, bx                  ; dx = hit - (base - BELOW)
        cmp     dx, BELOW + SIZE + ABOVE
        jae     carpet
        lea     di, [bx-BELOW-2]        ; our body: scan on from under it
        jmp     scan

; Carpet: CWORDS words from TOP bytes above the hit down, with rep stosw.
carpet: add     di, TOP + 2
        mov     cx, CWORDS
        rep     stosw

; Sweep: 96 bombs WSTEP bytes apart under the carpet, one a turn.
sweep:
        mov     [di-14], ax
        mov     [di-30], ax
        mov     [di-46], ax
        mov     [di-62], ax
        mov     [di-78], ax
        mov     [di-94], ax
        mov     [di-110], ax
        mov     [di-126], ax
        mov     [di-142], ax
        mov     [di-158], ax
        mov     [di-174], ax
        mov     [di-190], ax
        mov     [di-206], ax
        mov     [di-222], ax
        mov     [di-238], ax
        mov     [di-254], ax
        mov     [di-270], ax
        mov     [di-286], ax
        mov     [di-302], ax
        mov     [di-318], ax
        mov     [di-334], ax
        mov     [di-350], ax
        mov     [di-366], ax
        mov     [di-382], ax
        mov     [di-398], ax
        mov     [di-414], ax
        mov     [di-430], ax
        mov     [di-446], ax
        mov     [di-462], ax
        mov     [di-478], ax
        mov     [di-494], ax
        mov     [di-510], ax
        mov     [di-526], ax
        mov     [di-542], ax
        mov     [di-558], ax
        mov     [di-574], ax
        mov     [di-590], ax
        mov     [di-606], ax
        mov     [di-622], ax
        mov     [di-638], ax
        mov     [di-654], ax
        mov     [di-670], ax
        mov     [di-686], ax
        mov     [di-702], ax
        mov     [di-718], ax
        mov     [di-734], ax
        mov     [di-750], ax
        mov     [di-766], ax
        mov     [di-782], ax
        mov     [di-798], ax
        mov     [di-814], ax
        mov     [di-830], ax
        mov     [di-846], ax
        mov     [di-862], ax
        mov     [di-878], ax
        mov     [di-894], ax
        mov     [di-910], ax
        mov     [di-926], ax
        mov     [di-942], ax
        mov     [di-958], ax
        mov     [di-974], ax
        mov     [di-990], ax
        mov     [di-1006], ax
        mov     [di-1022], ax
        mov     [di-1038], ax
        mov     [di-1054], ax
        mov     [di-1070], ax
        mov     [di-1086], ax
        mov     [di-1102], ax
        mov     [di-1118], ax
        mov     [di-1134], ax
        mov     [di-1150], ax
        mov     [di-1166], ax
        mov     [di-1182], ax
        mov     [di-1198], ax
        mov     [di-1214], ax
        mov     [di-1230], ax
        mov     [di-1246], ax
        mov     [di-1262], ax
        mov     [di-1278], ax
        mov     [di-1294], ax
        mov     [di-1310], ax
        mov     [di-1326], ax
        mov     [di-1342], ax
        mov     [di-1358], ax
        mov     [di-1374], ax
        mov     [di-1390], ax
        mov     [di-1406], ax
        mov     [di-1422], ax
        mov     [di-1438], ax
        mov     [di-1454], ax
        mov     [di-1470], ax
        mov     [di-1486], ax
        mov     [di-1502], ax
        mov     [di-1518], ax
        mov     [di-1534], ax
        sub     di, WIDE * WSTEP        ; scan on from under the sweep
        jmp     scan

end:
