import Foundation
import AVFoundation
import CoreGraphics
import CoreText
import CoreVideo

// Original teaching schematic, not real monitoring footage or a claim about a place.
let output = URL(fileURLWithPath: CommandLine.arguments[1])
try? FileManager.default.removeItem(at: output)
let width = 640, height = 360, fps: Int32 = 24, frames = 144
let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height])
writer.add(input); writer.startWriting(); writer.startSession(atSourceTime: .zero)
func color(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat) -> CGColor { CGColor(red:r, green:g, blue:b, alpha:1) }
func label(_ ctx: CGContext, _ text: String, _ x: CGFloat, _ y: CGFloat, _ size: CGFloat, _ tint: CGColor) {
    let font = CTFontCreateWithName("PingFangSC-Medium" as CFString, size, nil)
    let attr = NSAttributedString(string:text, attributes:[NSAttributedString.Key(kCTFontAttributeName as String):font, NSAttributedString.Key(kCTForegroundColorAttributeName as String):tint])
    ctx.textPosition = CGPoint(x:x,y:y); CTLineDraw(CTLineCreateWithAttributedString(attr),ctx)
}
for frame in 0..<frames {
    while !input.isReadyForMoreMediaData { usleep(1000) }
    var raw: CVPixelBuffer?
    guard let pool=adaptor.pixelBufferPool else { throw writer.error ?? NSError(domain:"video.pool",code:1) }
    CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &raw)
    let buffer = raw!; CVPixelBufferLockBaseAddress(buffer, [])
    let ctx = CGContext(data:CVPixelBufferGetBaseAddress(buffer),width:width,height:height,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(buffer),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
    let lake=color(0.09,0.42,0.50), paper=color(0.94,0.92,0.85), ink=color(0.15,0.24,0.20)
    ctx.setFillColor(paper);ctx.fill(CGRect(x:0,y:0,width:width,height:height))
    label(ctx,"观察示意 · 水域中的短暂相遇",26,315,25,ink)
    label(ctx,"原创教学动画，非真实监测影像",26,286,14,lake)
    ctx.setFillColor(color(0.74,0.84,0.80));ctx.fill(CGRect(x:20,y:64,width:600,height:194))
    for row in 0..<5 {
        let y = CGFloat(90 + row*31)
        ctx.setStrokeColor(color(0.88,0.93,0.89));ctx.setLineWidth(2);ctx.beginPath()
        for x in stride(from:20,through:620,by:5) {
            let yy=y+sin(Double(x)/34+Double(frame)/18+Double(row))*3
            if x==20 {ctx.move(to:CGPoint(x:Double(x),y:yy))}else{ctx.addLine(to:CGPoint(x:Double(x),y:yy))}
        };ctx.strokePath()
    }
    let phase=Double(frame%48)/48, xx=70+phase*480, yy=145+sin(phase*Double.pi)*26
    ctx.setFillColor(lake);ctx.fillEllipse(in:CGRect(x:xx,y:yy,width:66,height:22))
    ctx.beginPath();ctx.move(to:CGPoint(x:xx+30,y:yy+18));ctx.addLine(to:CGPoint(x:xx+37,y:yy+41));ctx.addLine(to:CGPoint(x:xx+47,y:yy+17));ctx.closePath();ctx.fillPath()
    ctx.beginPath();ctx.move(to:CGPoint(x:xx+8,y:yy+12));ctx.addLine(to:CGPoint(x:xx-9,y:yy+25));ctx.addLine(to:CGPoint(x:xx-5,y:yy-1));ctx.closePath();ctx.fillPath()
    ctx.setFillColor(paper);ctx.fillEllipse(in:CGRect(x:xx+52,y:yy+12,width:3,height:3))
    label(ctx,"片段记录：第 \(frame/48+1) 次出现",26,27,19,ink)
    label(ctx,"6 秒观察片段",475,27,16,lake)
    CVPixelBufferUnlockBaseAddress(buffer, [])
    if !adaptor.append(buffer,withPresentationTime:CMTime(value:Int64(frame),timescale:fps)){throw writer.error ?? NSError(domain:"video",code:1)}
}
input.markAsFinished();let complete=DispatchSemaphore(value:0);writer.finishWriting{complete.signal()};complete.wait()
if writer.status != .completed {throw writer.error ?? NSError(domain:"video",code:2)}
print("Teaching video created.")
