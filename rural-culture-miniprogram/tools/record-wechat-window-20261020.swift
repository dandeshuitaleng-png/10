import Foundation
import AppKit
import ScreenCaptureKit
import AVFoundation
import CoreMedia
import ImageIO
import UniformTypeIdentifiers

final class WindowMovie: NSObject, SCStreamOutput, SCStreamDelegate, @unchecked Sendable {
    let writer: AVAssetWriter
    let input: AVAssetWriterInput
    let readyURL: URL
    let adaptor: AVAssetWriterInputPixelBufferAdaptor
    var frames = 0
    var lastBuffer: CVPixelBuffer?
    var startNanos: UInt64?
    var stoppedError: Error?
    var timer: DispatchSourceTimer?
    init(output: URL, width: Int, height: Int, ready: URL) throws {
        try? FileManager.default.removeItem(at: output)
        writer = try AVAssetWriter(outputURL: output, fileType: .mov)
        input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height, AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 8_000_000, AVVideoExpectedSourceFrameRateKey: 30, AVVideoMaxKeyFrameIntervalKey: 60]])
        input.expectsMediaDataInRealTime = true
        adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA,kCVPixelBufferWidthKey as String:width,kCVPixelBufferHeightKey as String:height])
        readyURL = ready
        super.init()
        writer.add(input)
        guard writer.startWriting() else { throw writer.error! }
        writer.startSession(atSourceTime:.zero)
    }
    func startTimer(queue: DispatchQueue) {
        let timer=DispatchSource.makeTimerSource(queue:queue)
        timer.schedule(deadline:.now(),repeating:.nanoseconds(33_333_333),leeway:.milliseconds(2))
        timer.setEventHandler { [weak self] in self?.writeFrame() }
        self.timer=timer;timer.resume()
    }
    func writeFrame() {
        guard let buffer=lastBuffer,input.isReadyForMoreMediaData else { return }
        let now=DispatchTime.now().uptimeNanoseconds
        if startNanos == nil { startNanos=now }
        let ticks=Int64((now-startNanos!)/1_000_000)
        if adaptor.append(buffer,withPresentationTime:CMTime(value:ticks,timescale:1000)) {
            frames += 1
            if frames==1 {
                let data=try! JSONSerialization.data(withJSONObject:["ready":true,"unixTime":Date().timeIntervalSince1970],options:[.sortedKeys]);try? data.write(to:readyURL)
                print("WINDOW_RECORDING_READY");fflush(stdout)
            }
        } else { stoppedError=writer.error }
    }
    func stream(_ stream: SCStream, didOutputSampleBuffer sample: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .screen,sample.isValid else { return }
        if let attachments=CMSampleBufferGetSampleAttachmentsArray(sample,createIfNecessary:false) as? [[SCStreamFrameInfo:Any]],let value=attachments.first?[.status] as? Int,value != SCFrameStatus.complete.rawValue { return }
        if let buffer=CMSampleBufferGetImageBuffer(sample) { lastBuffer=buffer }
    }
    func stream(_ stream: SCStream, didStopWithError error: Error) { stoppedError = error }
}

@main struct Main {
    static func main() async throws {
        NSApplication.shared.setActivationPolicy(.prohibited)
        let args=CommandLine.arguments
        guard args.count >= 5 else { fatalError("window-id output.mov maximum-seconds stop-file [window.png]") }
        let id=UInt32(args[1])!, output=URL(fileURLWithPath:args[2]), limit=Double(args[3])!, stop=URL(fileURLWithPath:args[4]), ready=output.appendingPathExtension("ready.json")
        try? FileManager.default.removeItem(at:stop); try? FileManager.default.removeItem(at:ready)
        let content=try await SCShareableContent.excludingDesktopWindows(true,onScreenWindowsOnly:false)
        guard let window=content.windows.first(where:{$0.windowID==id}) else { fatalError("Requested WeChat window not found") }
        guard window.owningApplication?.applicationName.contains("微信开发者工具") == true else { fatalError("Refusing to record another application") }
        let filter=SCContentFilter(desktopIndependentWindow:window)
        let configuration=SCStreamConfiguration();configuration.width=Int(window.frame.width*2)/2*2;configuration.height=Int(window.frame.height*2)/2*2;configuration.minimumFrameInterval=CMTime(value:1,timescale:30);configuration.queueDepth=5;configuration.showsCursor=false;configuration.capturesAudio=false;configuration.pixelFormat=kCVPixelFormatType_32BGRA
        if args.count>5 {
            let image=try await SCScreenshotManager.captureImage(contentFilter:filter,configuration:configuration)
            let url=URL(fileURLWithPath:args[5]);let dest=CGImageDestinationCreateWithURL(url as CFURL,UTType.png.identifier as CFString,1,nil)!;CGImageDestinationAddImage(dest,image,nil);CGImageDestinationFinalize(dest)
        }
        let movie=try WindowMovie(output:output,width:configuration.width,height:configuration.height,ready:ready)
        let queue=DispatchQueue(label:"ecology-video-writer"),stream=SCStream(filter:filter,configuration:configuration,delegate:movie)
        try stream.addStreamOutput(movie,type:.screen,sampleHandlerQueue:queue)
        movie.startTimer(queue:queue)
        let started=Date();try await stream.startCapture()
        while Date().timeIntervalSince(started)<limit && !FileManager.default.fileExists(atPath:stop.path) {
            try await Task.sleep(nanoseconds:200_000_000)
            if movie.stoppedError != nil { break }
        }
        try await stream.stopCapture()
        queue.sync { movie.timer?.cancel();movie.writeFrame();movie.input.markAsFinished() }
        await movie.writer.finishWriting()
        guard movie.writer.status == .completed, movie.frames>0 else { throw movie.stoppedError ?? movie.writer.error ?? NSError(domain:"window-video",code:1) }
        let report:[String:Any] = ["windowID":id,"windowTitle":window.title ?? "", "width":configuration.width,"height":configuration.height,"frames":movie.frames,"elapsedSeconds":Date().timeIntervalSince(started),"windowOnly":true,"audio":false,"subtitles":false]
        let data=try JSONSerialization.data(withJSONObject:report,options:[.prettyPrinted,.sortedKeys]);try data.write(to:output.appendingPathExtension("json"));print(String(data:data,encoding:.utf8)!)
    }
}
