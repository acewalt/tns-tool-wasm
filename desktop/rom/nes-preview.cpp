// Host I/O only. The pinned InfoNES core supplies all game emulation.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include "InfoNES.h"
#include "InfoNES_System.h"
/* PINNED_PALETTE */
static const unsigned char *cartridge;
static unsigned cartridge_size,keys;
static unsigned short pixels[320*240];
int InfoNES_Menu(){return 0;}
int InfoNES_ReadRom(const char*){
 if(cartridge_size<16)return -1;
 memcpy(&NesHeader,cartridge,16);
 if(memcmp(NesHeader.byID,"NES\x1a",4))return -1;
 unsigned prg=NesHeader.byRomSize*0x4000u,chr=NesHeader.byVRomSize*0x2000u,offset=16;
 memset(SRAM,0,SRAM_SIZE);if(NesHeader.byInfo1&4){if(cartridge_size<528)return -1;memcpy(SRAM+0x1000,cartridge+16,512);offset+=512;}
 if(!prg||offset+prg+chr>cartridge_size)return -1;
 ROM=(BYTE*)malloc(prg);VROM=chr?(BYTE*)malloc(chr):NULL;if(!ROM||(chr&&!VROM)){InfoNES_ReleaseRom();return -1;}
 memcpy(ROM,cartridge+offset,prg);if(chr)memcpy(VROM,cartridge+offset+prg,chr);return 0;
}
void InfoNES_ReleaseRom(){free(ROM);free(VROM);ROM=VROM=NULL;}
void InfoNES_LoadFrame(){for(unsigned y=0;y<240;y++)for(unsigned x=0;x<320;x++){unsigned c=WorkFrame[y*256+x*256/320]&0x7fff;pixels[y*320+x]=((c&0x7c00)<<1)|((c&0x3e0)<<1)|(c&31);}}
void InfoNES_PadState(DWORD *p1,DWORD *p2,DWORD *system){
 *p1=((keys>>4)&1)|(((keys>>5)&1)<<1)|(((keys>>8)&1)<<2)|(((keys>>10)&1)<<3)|((keys&1)<<4)|(((keys>>1)&1)<<5)|(((keys>>2)&1)<<6)|(((keys>>3)&1)<<7);*p2=0;*system=0;
}
void *InfoNES_MemoryCopy(void*d,const void*s,int n){return memcpy(d,s,n);}
void *InfoNES_MemorySet(void*d,int c,int n){return memset(d,c,n);}
void InfoNES_DebugPrint(char*){}
void InfoNES_MessageBox(char*,...){}
void InfoNES_Wait(){}
void InfoNES_SoundInit(){}
int InfoNES_SoundOpen(int,int){return 0;}
void InfoNES_SoundClose(){}
void InfoNES_SoundOutput(int,BYTE*,BYTE*,BYTE*,BYTE*,BYTE*){}
extern "C" {
int tns_load(const unsigned char *rom,unsigned size){cartridge=rom;cartridge_size=size;InfoNES_Init();int result=InfoNES_Load("cartridge");FrameSkip=0;return result;}
void tns_step(unsigned held){keys=held;InfoNES_Cycle();}
void *tns_pixels(){return pixels;}
void *tns_save(){return SRAM;}
unsigned tns_save_size(){return (NesHeader.byInfo1&2)?SRAM_SIZE:0;}
}
