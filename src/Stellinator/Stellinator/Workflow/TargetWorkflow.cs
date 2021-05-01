// Copyright (c) Jeremy Likness. All rights reserved.
// Licensed under the MIT License. See LICENSE in the repository root for license information.

using System;
using System.Linq;
using Stellinator.Configuration;
using Stellinator.Interfaces;

namespace Stellinator.Workflow
{
    /// <summary>
    /// Target processing.
    /// </summary>
    public class TargetWorkflow : IWorkflow
    {
        /// <summary>
        /// Process the files to target.
        /// </summary>
        /// <param name="options">The <see cref="Options"/>.</param>
        /// <param name="files">The list of <see cref="AstroFile"/> to process.</param>
        /// <returns>The processed files.</returns>
        public AstroFile[] Process(Options options, AstroFile[] files)
        {
            var ds = System.IO.Path.DirectorySeparatorChar;
            var directoryName = string.Empty;
            var fileName = string.Empty;
            var imageIndex = 1;
            var rejectedIndex = 1;

            Func<string> genFileName = options.TargetFilenameStrategy switch
            {
                TargetFilenameStrategy.New => () => options.NewFilename,
                TargetFilenameStrategy.Original => () => null,
                TargetFilenameStrategy.Ticks => () => DateTime.UtcNow.Ticks.ToString(),
                TargetFilenameStrategy.TicksHex => () => DateTime.UtcNow.Ticks.ToString("x"),
                _ => throw new InvalidOperationException("I don't know how I got here.")
            };

            var observations = files.Where(f => f.Valid)
                .Select(f => f.Observation).Distinct();

            Action<string> log = options.QuietMode ?
                msg => { }
            : Console.WriteLine;

            foreach (var observation in observations)
            {
                imageIndex = rejectedIndex = 1;
                fileName = genFileName();

                var dates = files.Where(f => f.Observation == observation)
                    .Select(f => f.ObservationDate).Distinct();

                directoryName = observation;

                foreach (var date in dates)
                {
                    if (options.GroupStrategy != GroupStrategy.Observation)
                    {
                        var dateStr = date.ToString("yyyy-MM-dd");
                        directoryName = $"{directoryName}{ds}{dateStr}";
                    }

                    if (options.GroupStrategy == GroupStrategy.Date)
                    {
                        imageIndex = rejectedIndex = 1;
                        fileName = genFileName();
                    }

                    var captures = files.Where(f => f.Observation == observation
                    && f.ObservationDate == date)
                        .Select(f => f.Capture).Distinct();

                    foreach (var capture in captures)
                    {
                        if (options.GroupStrategy == GroupStrategy.Capture)
                        {
                            imageIndex = rejectedIndex = 1;
                            fileName = genFileName();
                            directoryName = $"{directoryName}{ds}{capture}";
                        }

                        var filesToProcess = files.Where(
                            f => f.Observation == observation
                            && f.ObservationDate == date
                            && f.Capture == capture
                            && f.Valid)
                            .OrderBy(f => f.FileExtension)
                            .ThenBy(f => f.FileName);

                        foreach (var file in filesToProcess)
                        {
                            string subdir = "Accepted";

                            if (file.IsProcessed == false)
                            {
                                if (file.Rejected)
                                {
                                    subdir = "Rejected";
                                    var seq = string.Format("{0:0000}", rejectedIndex.ToString());
                                    rejectedIndex++;
                                    file.NewFileName = $"{file.FileName}-{seq}";
                                }
                                else
                                {
                                    var newFileName = genFileName();

                                    if (newFileName == null)
                                    {
                                        file.NewFileName = file.FileName;
                                    }
                                    else
                                    {
                                        var seq = string.Format("{0:0000}", imageIndex);
                                        imageIndex++;
                                        file.NewFileName = $"{newFileName}-{seq}";
                                    }
                                }
                            }
                            else
                            {
                                file.NewFileName = file.FileName;
                                subdir = "Processed";
                            }

                            var targetDirectory = options.TargetDirectory;

                            // check for overlap with target directory
                            var parts = directoryName.Split(
                                System.IO.Path.DirectorySeparatorChar)
                                .ToList();

                            do
                            {
                                var stub = string.Join(
                                    System.IO.Path.DirectorySeparatorChar,
                                    parts);
                                if (targetDirectory.EndsWith(stub))
                                {
                                    var idx = targetDirectory.LastIndexOf(stub);
                                    targetDirectory = targetDirectory
                                        .Substring(0, idx);
                                    break;
                                }

                                parts.RemoveAt(parts.Count - 1);
                            }
                            while (parts.Any());

                            file.TargetPath = System.IO.Path.Combine(
                                targetDirectory,
                                directoryName,
                                subdir,
                                $"{file.NewFileName}.{file.FileExtension}");
                        }
                    }
                }
            }

            Console.WriteLine("Finishing assigning files.");

            foreach (var file in files.OrderBy(f => f.TargetPath))
            {
                Console.WriteLine($"{file.SourcePath} => {file.TargetPath}");
            }

            return files;
        }
    }
}
