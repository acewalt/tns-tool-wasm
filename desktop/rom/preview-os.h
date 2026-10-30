/* Minimal LCD/key facade for the same frontend compiled to WebAssembly. */
#pragma once
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
enum { KEY_NSPIRE_UP,KEY_NSPIRE_DOWN,KEY_NSPIRE_LEFT,KEY_NSPIRE_RIGHT,
 KEY_NSPIRE_CTRL,KEY_NSPIRE_SHIFT,KEY_NSPIRE_VAR,KEY_NSPIRE_DEL,
 KEY_NSPIRE_TAB,KEY_NSPIRE_MENU,KEY_NSPIRE_ENTER,KEY_NSPIRE_MINUS,KEY_NSPIRE_ESC };
enum { SCR_320x240_565 };
#ifdef __cplusplus
extern "C" {
#endif
extern unsigned tns_preview_keys;
static inline int isKeyPressed(unsigned key){return (tns_preview_keys>>key)&1;}
static inline int lcd_init(int){return 1;}
static inline void lcd_blit(const void*,int){}
#ifdef __cplusplus
}
#endif
