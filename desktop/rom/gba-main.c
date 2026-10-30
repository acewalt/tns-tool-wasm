/* LCD/input adapter for the gpSP Nspire core. No vendor firmware is needed. */
#ifdef TNS_ROM_PREVIEW
#include "preview-os.h"
#endif
#include "common.h"
#include "embedded_rom.h"

static unsigned short pixels[320*240];
static u32 held_keys;
u32 update_backup_flag=1,synchronize_flag=1;
s32 relative_frame_count;
char backup_filename[512]=TNS_SAVE_FILENAME;
static int dirty;

FILE *tns_rom_open(const char *name,const char *mode){
 if(!strcmp(name,"embedded.gba")&&mode[0]=='r')return fmemopen((void*)tns_rom_data,TNS_ROM_SIZE,"rb");
 return fopen(name,mode);
}
void nspire_fps_overlay_reset(void){}
void nspire_video_mix_reset(void){}
void video_fill_u16_strip_arm(u16 *dst,u32 count,u32 value){while(count--)*dst++=(u16)value;}
void nspire_osd_message(const char *format,...){(void)format;}
void nspire_backup_mark_dirty(void){dirty=1;}
void update_backup(void){}
void update_backup_force(void){}
void nspire_load_cartridge_backup(void){}
void set_clock_speed(void){}
void quit(void){exit(0);}
void init_input(void){}
bool input_check_savestate(const u8 *src){(void)src;return true;}
bool input_read_savestate(const u8 *src){(void)src;return true;}
unsigned input_write_savestate(u8 *dst){(void)dst;return 0;}
u32 update_input(void){return 0;}
int load_state(u8 *name){(void)name;return -1;}
void save_state(u8 *name,u16 *frame){(void)name;(void)frame;}
u32 load_backup(char *name){(void)name;return 0;}
u32 save_backup(char *name){(void)name;return 0;}

static void set_keys(unsigned keys){
 u32 buttons=0;
 if(keys&(1u<<0))buttons|=BUTTON_UP;
 if(keys&(1u<<1))buttons|=BUTTON_DOWN;
 if(keys&(1u<<2))buttons|=BUTTON_LEFT;
 if(keys&(1u<<3))buttons|=BUTTON_RIGHT;
 if(keys&(1u<<4))buttons|=BUTTON_A;
 if(keys&(1u<<5))buttons|=BUTTON_B;
 if(keys&(1u<<10))buttons|=BUTTON_START;
 if(keys&(1u<<8))buttons|=BUTTON_SELECT;
 if(keys&(1u<<6))buttons|=BUTTON_L;
 if(keys&(1u<<7))buttons|=BUTTON_R;
 if((buttons&~held_keys)&&(read_ioreg(REG_P1CNT)&0x4000)){
  unsigned mask=read_ioreg(REG_P1CNT)&0x3ff;
  if((read_ioreg(REG_P1CNT)&0x8000)?(buttons&mask)==mask:(buttons&mask)!=0){flag_interrupt(IRQ_KEYPAD);check_and_raise_interrupts();}
 }
 held_keys=buttons;write_ioreg(REG_P1,(~buttons)&0x3ff);
}
static void frame(unsigned keys){
 set_keys(keys);clear_gamepak_stickybits();execute_arm(execute_cycles);
 for(unsigned y=0;y<213;y++)for(unsigned x=0;x<320;x++)pixels[(y+13)*320+x]=gba_screen_pixels[(y*160/213)*240+x*240/320];
 lcd_blit(pixels,SCR_320x240_565);
}
static int initialize(void){
 extern u32 nspire_rom_buffer_size_choice;
 nspire_rom_buffer_size_choice=2;init_gamepak_buffer();init_sound();
 memcpy(bios_rom,open_gba_bios_rom,sizeof(bios_rom));
 gba_screen_pixels=calloc(1,GBA_SCREEN_BUFFER_SIZE);if(!gba_screen_pixels)return 1;
 if(load_gamepak(NULL,"embedded.gba",FEAT_AUTODETECT,FEAT_AUTODETECT,SERIAL_MODE_DISABLED))return 2;
 reset_gba();
 FILE *save=fopen(TNS_SAVE_FILENAME,"rb");if(save){fread(gamepak_backup,1,0x20000,save);fclose(save);}
 if(!lcd_init(SCR_320x240_565))return 3;
 puts("GBA cartridge running");fflush(stdout);return 0;
}
#ifdef TNS_ROM_PREVIEW
unsigned tns_preview_keys,TNS_ROM_SIZE;
const unsigned char *tns_rom_data;
int tns_load(const unsigned char *data,unsigned size){tns_rom_data=data;TNS_ROM_SIZE=size;return initialize();}
void tns_step(unsigned keys){tns_preview_keys=keys;frame(keys);}
unsigned short *tns_pixels(void){return pixels;}
unsigned char *tns_save(void){return gamepak_backup;}
unsigned tns_save_size(void){return 0x20000;}
#else
/* Ndless keys are structures, so build the common bitset explicitly. */
static unsigned keys(void){
 unsigned k=0;
 if(isKeyPressed(KEY_NSPIRE_UP))k|=1u<<0;if(isKeyPressed(KEY_NSPIRE_DOWN))k|=1u<<1;
 if(isKeyPressed(KEY_NSPIRE_LEFT))k|=1u<<2;if(isKeyPressed(KEY_NSPIRE_RIGHT))k|=1u<<3;
 if(isKeyPressed(KEY_NSPIRE_CTRL))k|=1u<<4;if(isKeyPressed(KEY_NSPIRE_SHIFT))k|=1u<<5;
 if(isKeyPressed(KEY_NSPIRE_VAR))k|=1u<<6;if(isKeyPressed(KEY_NSPIRE_DEL))k|=1u<<7;
 if(isKeyPressed(KEY_NSPIRE_TAB))k|=1u<<8;if(isKeyPressed(KEY_NSPIRE_ENTER))k|=1u<<10;
 return k;
}
int main(void){
 int result=initialize();if(result){printf("GBA initialization failed: %d\n",result);return result;}
 while(!isKeyPressed(KEY_NSPIRE_ESC))frame(keys());
 {FILE *save=fopen(TNS_SAVE_FILENAME,"wb");if(save){fwrite(gamepak_backup,1,0x20000,save);fclose(save);}}
 memory_term();puts("GBA saved and exited");return 0;
}
#endif
