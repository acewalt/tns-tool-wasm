/* ARM926 has SWP/SWPB; these keep std::atomic exchange valid without libatomic. */
unsigned char tns_exchange_byte(volatile void *p,unsigned char value,int order) __asm__("__atomic_exchange_1");
unsigned int tns_exchange_word(volatile void *p,unsigned int value,int order) __asm__("__atomic_exchange_4");
unsigned char tns_exchange_byte(volatile void *p,unsigned char value,int order){
 (void)order;
#ifdef __arm__
 unsigned int previous;__asm__ volatile("swpb %0,%2,[%1]":"=&r"(previous):"r"(p),"r"(value):"memory");return (unsigned char)previous;
#else
 unsigned char previous=*(volatile unsigned char*)p;*(volatile unsigned char*)p=value;return previous;
#endif
}
unsigned int tns_exchange_word(volatile void *p,unsigned int value,int order){
 (void)order;
#ifdef __arm__
 unsigned int previous;__asm__ volatile("swp %0,%2,[%1]":"=&r"(previous):"r"(p),"r"(value):"memory");return previous;
#else
 unsigned int previous=*(volatile unsigned int*)p;*(volatile unsigned int*)p=value;return previous;
#endif
}
