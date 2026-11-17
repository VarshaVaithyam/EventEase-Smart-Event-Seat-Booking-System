package com.cardinality.eventbooking.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private static final Set<String> EXCLUDED_DIRS = Set.of(
            ".git", "node_modules", "target", "dist", "coverage", ".vite", "__pycache__"
    );

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "EventEase Spring Boot API",
                "timestamp", Instant.now().toString()
        ));
    }

    @GetMapping("/project-zip")
    public ResponseEntity<byte[]> downloadProjectZip() throws IOException {
        Path cwd = Paths.get("").toAbsolutePath().normalize();
        Path projectRoot = Files.exists(cwd.resolve("backend")) ? cwd : cwd.getParent();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            Files.walkFileTree(projectRoot, new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
                    String name = dir.getFileName() != null ? dir.getFileName().toString() : "";
                    if (!dir.equals(projectRoot) && EXCLUDED_DIRS.contains(name)) {
                        return FileVisitResult.SKIP_SUBTREE;
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    String fname = file.getFileName().toString();
                    if (fname.endsWith(".zip") || ".DS_Store".equals(fname)) {
                        return FileVisitResult.CONTINUE;
                    }
                    String rel = projectRoot.relativize(file).toString().replace('\\', '/');
                    ZipEntry entry = new ZipEntry("EventEase-Smart-Event-Seat-Booking-System/" + rel);
                    zos.putNextEntry(entry);
                    Files.copy(file, zos);
                    zos.closeEntry();
                    return FileVisitResult.CONTINUE;
                }
            });
        }

        byte[] bytes = baos.toByteArray();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"EventEase-Smart-Event-Seat-Booking-System.zip\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(bytes.length)
                .body(bytes);
    }
}
