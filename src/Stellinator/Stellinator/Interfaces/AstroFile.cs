// Copyright (c) Jeremy Likness. All rights reserved.
// Licensed under the MIT License. See LICENSE in the repository root for license information.

using System;

namespace Stellinator.Interfaces
{
    /// <summary>
    /// Represents a file to process.
    /// </summary>
    public class AstroFile
    {
        /// <summary>
        /// Gets or sets the observation value.
        /// </summary>
        public string Observation { get; set; }

        /// <summary>
        /// Gets or sets the date of the observation.
        /// </summary>
        public DateTime ObservationDate { get; set; }

        /// <summary>
        /// Gets or sets the observation sequence.
        /// </summary>
        public string ObservationSequence { get; set; }

        /// <summary>
        /// Gets or sets the capture information.
        /// </summary>
        public string Capture { get; set; }

        /// <summary>
        /// Gets or sets the source path of the file.
        /// </summary>
        public string SourcePath { get; set; }

        /// <summary>
        /// Gets or sets the target path of the file.
        /// </summary>
        public string TargetPath { get; set; }

        /// <summary>
        /// Gets or sets the local (not full path) name of the file.
        /// </summary>
        public string FileName { get; set; }

        /// <summary>
        /// Gets or sets the renamed file name.
        /// </summary>
        public string NewFileName { get; set; }

        /// <summary>
        /// Gets the filename to match for processed (not raw) files
        /// to find a correlated FITS.
        /// </summary>
        public string FileNameMatch => IsProcessed ?
            FileName : $"{FileName}-output";

        /// <summary>
        /// Gets or sets the file extension without the period.
        /// </summary>
        public string FileExtension { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the file is a processed jpeg or tiff.
        /// </summary>
        public bool IsProcessed { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the file is a raw FITS file.
        /// </summary>
        public bool IsRaw { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the file was rejected.
        /// </summary>
        public bool Rejected { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the file is a valid Stellina artifact.
        /// </summary>
        public bool Valid { get; set; }

        /// <summary>
        /// Gets the string representation.
        /// </summary>
        /// <returns>The string representation.</returns>
        public override string ToString()
        {
            var key = $"{Observation}:{ObservationDate}:{ObservationSequence}:{Capture}=>{FileName}.{FileExtension}";
            var status = Valid ? "VALID " : "INVALID ";
            var accepted = Rejected ? "REJECTED " : "ACCEPTED ";
            var baseStr = $"{status}\t{accepted}\t{key}";
            if (string.IsNullOrWhiteSpace(NewFileName))
            {
                return baseStr;
            }

            if (string.IsNullOrWhiteSpace(TargetPath))
            {
                return $"{baseStr} => {NewFileName}";
            }

            return $"{baseStr} => {TargetPath}";
        }
    }
}
