'use-strict';

import readline from 'readline';
import { spawn } from 'child_process';

import Logger from '../../services/logger/logger.service.js';

export default class FfmpegProcess {
  constructor(cameraName, videoDebug, sessionId, videoProcessor, command, delegate, callback) {
    this.log = Logger.log;

    this.log.debug(`Stream command: ${videoProcessor} ${command.join(' ')}`, cameraName);

    let started = false;
    const startTime = Date.now();

    this.process = spawn(videoProcessor, command, {
      env: process.env,
    });

    this.process.stdout.on('data', (data) => {
      const progress = this.parseProgress(data);

      if (progress && !started && progress.frame > 0) {
        started = true;
        const runtime = (Date.now() - startTime) / 1000;
        const message = `Getting the first frames took ${runtime} seconds.`;

        if (runtime < 5) {
          this.log.debug(message, cameraName);
        } else if (runtime < 22) {
          this.log.warn(message, cameraName, 'Homebridge');
        } else {
          this.log.error(message, cameraName, 'Homebridge');
        }
      }
    });

    const stderr = readline.createInterface({
      input: this.process.stderr,
      terminal: false,
    });

    let errors = [];

    stderr.on('line', (line) => {
      if (callback) {
        callback();
        callback = undefined;
      }

      if (/\[(panic|fatal|error)]/.test(line)) {
        errors = errors.slice(-5);
        errors.push(line);

        this.log.debug(line, cameraName);
      } else if (videoDebug) {
        this.log.debug(line, cameraName);
      }
    });

    this.process.on('error', (error) => {
      this.log.error(`FFmpeg process creation failed: ${error.message}`, cameraName, 'Homebridge');

      if (callback) {
        callback(new Error('FFmpeg process creation failed'));
      }

      delegate.stopStream(sessionId);
    });

    this.process.on('exit', (code, signal) => {
      const message = `FFmpeg exited with code: ${code} and signal: ${signal}`;
      errors.unshift(`${message}`);

      if (code == undefined || code === 255) {
        if (this.process.killed) {
          this.log.debug(`${message} (Expected)`, cameraName);
        } else {
          this.log.warn(errors.join(' - '), cameraName, 'Homebridge');
        }
      } else {
        this.log.error(errors.join(' - '), cameraName, 'Homebridge');

        delegate.stopStream(sessionId);

        if (!started && callback) {
          callback(new Error(message));
        } else {
          delegate.controller.forceStopStreamingSession(sessionId);
        }
      }
    });
  }

  getStdin() {
    return this.process.stdin;
  }

  stop() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.socket.close();
    }

    this.process?.kill('SIGKILL');
  }

  parseProgress(data) {
    const input = data.toString();

    if (input.indexOf('frame=') == 0) {
      try {
        const progress = new Map();

        for (const line of input.split(/\r?\n/)) {
          const split = line.split('=', 2);
          progress.set(split[0], split[1]);
        }

        return {
          frame: Number.parseInt(progress.get('frame')),
          fps: Number.parseFloat(progress.get('fps')),
          stream_q: Number.parseFloat(progress.get('stream_0_0_q')),
          bitrate: Number.parseFloat(progress.get('bitrate')),
          total_size: Number.parseInt(progress.get('total_size')),
          out_time_us: Number.parseInt(progress.get('out_time_us')),
          out_time: progress.get('out_time').trim(),
          dup_frames: Number.parseInt(progress.get('dup_frames')),
          drop_frames: Number.parseInt(progress.get('drop_frames')),
          speed: Number.parseFloat(progress.get('speed')),
          progress: progress.get('progress').trim(),
        };
      } catch {
        return;
      }
    } else {
      return;
    }
  }
}
