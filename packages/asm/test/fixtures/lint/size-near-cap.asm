; size-near-cap: 90% of the lightweight limit of 512 bytes or more.
%name     "Big"
%strategy "Four hundred and sixty-one bytes."

start:  times   458 nop
        jmp     start                   ; rel16: 3 bytes, 461 in all
