/* This port executes on one thread. Creating a worker is an explicit error. */
#pragma once
#include <cstdlib>
#include <chrono>
#include <type_traits>
/* newlib typedefs uint32_t as unsigned long; Linux uses unsigned int. */
template<typename T,typename U> typename std::common_type<T,U>::type tns_min(T a,U b){using R=typename std::common_type<T,U>::type;return R(a)<R(b)?R(a):R(b);}
template<typename T,typename U> typename std::common_type<T,U>::type tns_max(T a,U b){using R=typename std::common_type<T,U>::type;return R(a)>R(b)?R(a):R(b);}
namespace TnsSingleThread {
class mutex { public: void lock(){} void unlock(){} bool try_lock(){return true;} };
enum class cv_status { no_timeout,timeout };
class condition_variable {
public:
 void notify_all(){} void notify_one(){}
 template<typename... T> void wait(T&&...){std::abort();}
 template<typename... T> typename std::conditional<sizeof...(T)==3,bool,cv_status>::type wait_for(T&&...){std::abort();}
 template<typename... T> typename std::conditional<sizeof...(T)==3,bool,cv_status>::type wait_until(T&&...){std::abort();}
};
class thread {
public:
 template<typename... T> explicit thread(T&&...){std::abort();}
 void join(){std::abort();}
};
namespace this_thread {
 inline void yield(){}
 template<typename T> void sleep_for(const T&){}
 template<typename T> void sleep_until(const T&){}
}
}
