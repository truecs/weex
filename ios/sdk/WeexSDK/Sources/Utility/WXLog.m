/**
 * Created by Weex.
 * Copyright (c) 2016, Alibaba, Inc. All rights reserved.
 *
 * This source code is licensed under the Apache Licence 2.0.
 * For the full copyright and license information,please view the LICENSE file in the root directory of this source tree.
 */

#import "WXLog.h"
#import "WXUtility.h"
#import "WXAssert.h"
#import "WXSDKManager.h"

// Xcode does NOT natively support colors in the Xcode debugging console.
// You'll need to install the XcodeColors plugin to see colors in the Xcode console.
// https://github.com/robbiehanson/XcodeColors
//
// The following is documentation from the XcodeColors project:
//
//
// How to apply color formatting to your log statements:
//
// To set the foreground color:
// Insert the ESCAPE_SEQ into your string, followed by "fg124,12,255;" where r=124, g=12, b=255.
//
// To set the background color:
// Insert the ESCAPE_SEQ into your string, followed by "bg12,24,36;" where r=12, g=24, b=36.
//
// To reset the foreground color (to default value):
// Insert the ESCAPE_SEQ into your string, followed by "fg;"
//
// To reset the background color (to default value):
// Insert the ESCAPE_SEQ into your string, followed by "bg;"
//
// To reset the foreground and background color (to default values) in one operation:
// Insert the ESCAPE_SEQ into your string, followed by ";"

#define XCODE_COLORS_ESCAPE_SEQ "\033["

#define XCODE_COLORS_RESET_FG   XCODE_COLORS_ESCAPE_SEQ "fg;" // Clear any foreground color
#define XCODE_COLORS_RESET_BG   XCODE_COLORS_ESCAPE_SEQ "bg;" // Clear any background color
#define XCODE_COLORS_RESET      XCODE_COLORS_ESCAPE_SEQ ";"  // Clear any foreground or background color


#ifdef DEBUG
static const WXLogLevel defaultLogLevel = WXLogLevelDebug;
#else
static const WXLogLevel defaultLogLevel = WXLogLevelWarning;
#endif

static id<WXLogProtocol> _externalLog;

@implementation WXLog
{
    WXLogLevel _logLevel;
}

+ (instancetype)sharedInstance
{
    static WXLog *_sharedInstance = nil;
    static dispatch_once_t oncePredicate;
    dispatch_once(&oncePredicate, ^{
        _sharedInstance = [[self alloc] init];
        _sharedInstance->_logLevel = defaultLogLevel;
    });
    return _sharedInstance;
}


+ (void)setLogLevel:(WXLogLevel)level
{
    if (((WXLog*)[self sharedInstance])->_logLevel != level) {
        ((WXLog*)[self sharedInstance])->_logLevel = level;
        
        [[WXSDKManager bridgeMgr] resetEnvironment];
    }
}

+ (WXLogLevel)logLevel
{
    return ((WXLog*)[self sharedInstance])->_logLevel;
}

+ (NSString *)logLevelString
{
    NSDictionary *logLevelEnumToString =
    @{
      @(WXLogLevelAll) : @"all",
      @(WXLogLevelError) : @"error",
      @(WXLogLevelWarning) : @"warn",
      @(WXLogLevelInfo) : @"info",
      @(WXLogLevelDebug) : @"debug",
      @(WXLogLevelVerbose) : @"verbose"
      };
    return [logLevelEnumToString objectForKey:@([self logLevel])];
}

+ (void)setLogLevelString:(NSString *)levelString
{
    NSDictionary *logLevelStringToEnum =
    @{
      @"all" : @(WXLogLevelAll),
      @"error" : @(WXLogLevelError),
      @"warn" : @(WXLogLevelWarning),
      @"info" : @(WXLogLevelInfo),
      @"debug" : @(WXLogLevelDebug),
      @"verbose" : @(WXLogLevelVerbose)
    };
    
    [self setLogLevel:[logLevelStringToEnum[levelString] unsignedIntegerValue]];
}

+ (void)log:(WXLogFlag)flag file:(const char *)fileName line:(NSUInteger)line format:(NSString *)format, ...
{
    if ([WXLog logLevel] & flag || [_externalLog logLevel] & flag) {
        if (!format) {
            return;
        }
        
        va_list args;
        va_start(args, format);
        NSString *message = [[NSString alloc] initWithFormat:format arguments:args];
        va_end(args);
        
        NSString *flagString;
        NSString *flagColor;
        switch (flag) {
            case WXLogFlagError:
                flagString = @"error";
                flagColor = @"fg255,0,0;";
                break;
            case WXLogFlagWarning:
                flagString = @"warn";
                flagColor = @"fg255,165,0;";
                break;
            case WXLogFlagDebug:
                flagString = @"debug";
                flagColor = @"fg0,128,0;";
                break;
            case WXLogFlagVerbose:
                flagString = @"verbose";
                flagColor = @"fg128,128,128;";
                break;
            default:
                flagString = @"info";
                flagColor = @"fg100,149,237;";
                break;
        }
        
        NSString *logMessage = [NSString stringWithFormat:@"%s%@ <Weex>[%@]%s:%ld, %@ %s", XCODE_COLORS_ESCAPE_SEQ, flagColor, flagString, fileName, (unsigned long)line, message, XCODE_COLORS_RESET];
        
        if ([_externalLog logLevel] & flag) {
            [_externalLog log:flag message:logMessage];
        }
        
        [[WXSDKManager bridgeMgr] logToWebSocket:flagString message:message];
        
        if ([WXLog logLevel] & flag) {
            NSLog(@"%@", logMessage);
        }
    }
}

#pragma mark - External Log

+ (void)registerExternalLog:(id<WXLogProtocol>)externalLog
{
    _externalLog = externalLog;
}

@end